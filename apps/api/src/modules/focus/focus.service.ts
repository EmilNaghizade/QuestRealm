import { randomUUID } from "node:crypto";
import mongoose, {
  mongo,
  type ClientSession,
  type HydratedDocument,
  type Types,
} from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User } from "../auth/user.model.js";
import {
  FocusTimer,
  type FocusMode,
  type FocusTimerRecord,
} from "./focus.model.js";
import { FocusSession } from "./focus-session.model.js";
import {
  getDurationMs,
  getRemainingMs,
  isTimerExpired,
  serializeFocusTimer,
  type FocusTimerSnapshot,
} from "./focus-time.js";
import type {
  FocusActionInput,
  UpdateFocusSettingsInput,
} from "./focus.validation.js";

type TimerDocument = HydratedDocument<FocusTimerRecord>;

type Operation =
  | { kind: "read" }
  | { kind: "action"; input: FocusActionInput }
  | { kind: "settings"; input: UpdateFocusSettingsInput };

type OperationFailure = {
  code: string;
  message: string;
};

export class FocusConflictError extends AppError {
  constructor(
    public readonly timer: FocusTimerSnapshot,
    code: string,
    message: string,
  ) {
    super(409, code, message);
  }
}

function prepareIdleTimer(timer: TimerDocument, mode: FocusMode): void {
  const durationMs = getDurationMs(mode, timer.settings);

  timer.mode = mode;
  timer.status = "idle";
  timer.cycleId = null;
  timer.durationMs = durationMs;
  timer.remainingMs = durationMs;
  timer.startedAt = null;
  timer.endsAt = null;
}

function startTimer(timer: TimerDocument, now: Date): void {
  const durationMs = getDurationMs(timer.mode, timer.settings);

  timer.status = "running";
  timer.cycleId = randomUUID();
  timer.durationMs = durationMs;
  timer.remainingMs = durationMs;
  timer.startedAt = now;
  timer.endsAt = new Date(now.getTime() + durationMs);
}

async function settleExpiredTimer(
  timer: TimerDocument,
  timeZone: string,
  now: Date,
  session: ClientSession,
): Promise<boolean> {
  if (!isTimerExpired(timer, now)) {
    return false;
  }

  const completedAt = timer.endsAt;

  if (!completedAt) {
    throw new Error("An expired timer must have an end time.");
  }

  if (timer.mode !== "focus") {
    prepareIdleTimer(timer, "focus");
    return true;
  }

  if (!timer.cycleId || !timer.startedAt) {
    throw new Error(
      "A completed focus timer must have a cycle and start time.",
    );
  }

  await FocusSession.create(
    [
      {
        userId: timer.userId,
        cycleId: timer.cycleId,
        durationMs: timer.durationMs,
        startedAt: timer.startedAt,
        completedAt,
        timeZone,
      },
    ],
    { session },
  );

  timer.completedFocusCount += 1;

  const breakMode: FocusMode =
    timer.completedFocusCount % 4 === 0 ? "longBreak" : "shortBreak";

  const breakDurationMs = getDurationMs(breakMode, timer.settings);

  timer.mode = breakMode;
  timer.status = "running";
  timer.cycleId = randomUUID();
  timer.durationMs = breakDurationMs;
  timer.remainingMs = breakDurationMs;

  // The break begins when focus actually ended.
  timer.startedAt = completedAt;
  timer.endsAt = new Date(completedAt.getTime() + breakDurationMs);

  // If the app was closed through the entire break,
  // prepare the next focus without starting it.
  if (isTimerExpired(timer, now)) {
    prepareIdleTimer(timer, "focus");
  }

  return true;
}

function applyAction(
  timer: TimerDocument,
  input: FocusActionInput,
  now: Date,
): OperationFailure | null {
  switch (input.action) {
    case "start": {
      if (timer.status !== "idle") {
        return {
          code: "FOCUS_ACTION_NOT_ALLOWED",
          message: "Only an idle timer can be started.",
        };
      }

      startTimer(timer, now);
      return null;
    }

    case "pause": {
      if (timer.status !== "running") {
        return {
          code: "FOCUS_ACTION_NOT_ALLOWED",
          message: "Only a running timer can be paused.",
        };
      }

      timer.remainingMs = getRemainingMs(timer, now);
      timer.status = "paused";
      timer.endsAt = null;

      return null;
    }

    case "resume": {
      if (timer.status !== "paused") {
        return {
          code: "FOCUS_ACTION_NOT_ALLOWED",
          message: "Only a paused timer can be resumed.",
        };
      }

      timer.status = "running";
      timer.endsAt = new Date(now.getTime() + timer.remainingMs);

      return null;
    }

    case "reset": {
      prepareIdleTimer(timer, timer.mode);
      return null;
    }

    case "switchMode": {
      if (timer.mode !== input.mode) {
        prepareIdleTimer(timer, input.mode);
      }

      return null;
    }
  }
}

async function executeOperation(
  userId: Types.ObjectId,
  operation: Operation,
): Promise<FocusTimerSnapshot> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await mongoose.connection.transaction(async (session) => {
        const user = await User.findById(userId)
          .select("timeZone characterId")
          .session(session);

        if (!user) {
          throw new AppError(
            401,
            "UNAUTHENTICATED",
            "Please sign in to continue.",
          );
        }

        if (!user.characterId) {
          throw new AppError(
            403,
            "CHARACTER_REQUIRED",
            "Choose your adventurer first.",
          );
        }

        let timer = await FocusTimer.findOne({
          userId,
        }).session(session);

        if (!timer) {
          timer = new FocusTimer({ userId });
        }

        const now = new Date();

        const didSettle = await settleExpiredTimer(
          timer,
          user.timeZone,
          now,
          session,
        );

        let failure: OperationFailure | null = null;

        if (operation.kind !== "read") {
          const currentRevision = timer.revision ?? 0;

          if (
            didSettle ||
            operation.input.expectedRevision !== currentRevision
          ) {
            failure = {
              code: "FOCUS_STATE_CHANGED",
              message:
                "Your timer has changed. Review its current state and try again.",
            };
          } else if (operation.kind === "action") {
            failure = applyAction(timer, operation.input, now);
          } else if (timer.status !== "idle") {
            failure = {
              code: "FOCUS_TIMER_BUSY",
              message: "Reset your timer before changing its durations.",
            };
          } else {
            timer.settings = {
              ...operation.input.settings,
            };

            prepareIdleTimer(timer, timer.mode);
          }
        }

        if (timer.isNew || timer.isModified()) {
          await timer.save({ session });
        }

        return {
          timer: serializeFocusTimer(timer, now),
          failure,
        };
      });

      // Throw after committing any completed focus session.
      // A stale command must not undo a valid completion.
      if (result.failure) {
        throw new FocusConflictError(
          result.timer,
          result.failure.code,
          result.failure.message,
        );
      }

      return result.timer;
    } catch (error) {
      const isVersionConflict = error instanceof mongoose.Error.VersionError;

      const isDuplicateKey =
        error instanceof mongo.MongoServerError && error.code === 11000;

      if (isVersionConflict || isDuplicateKey) {
        if (attempt < 2) {
          continue;
        }

        throw new AppError(
          409,
          "FOCUS_RETRY_REQUIRED",
          "Your timer changed during this request. Refresh and try again.",
        );
      }

      if (error instanceof mongo.MongoServerError && error.code === 20) {
        throw new AppError(
          503,
          "TRANSACTIONS_REQUIRED",
          "Focus sessions require a transaction-capable MongoDB deployment.",
        );
      }

      throw error;
    }
  }

  throw new AppError(
    409,
    "FOCUS_RETRY_REQUIRED",
    "Please refresh your timer and try again.",
  );
}

export function getFocusTimer(
  userId: Types.ObjectId,
): Promise<FocusTimerSnapshot> {
  return executeOperation(userId, {
    kind: "read",
  });
}

export function performFocusAction(
  userId: Types.ObjectId,
  input: FocusActionInput,
): Promise<FocusTimerSnapshot> {
  return executeOperation(userId, {
    kind: "action",
    input,
  });
}

export function updateFocusSettings(
  userId: Types.ObjectId,
  input: UpdateFocusSettingsInput,
): Promise<FocusTimerSnapshot> {
  return executeOperation(userId, {
    kind: "settings",
    input,
  });
}
