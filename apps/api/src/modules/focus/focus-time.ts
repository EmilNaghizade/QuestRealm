import type {
  FocusMode,
  FocusSettings,
  FocusTimerRecord,
} from "./focus.model.js";

const MINUTE_MS = 60 * 1000;

export function getDurationMs(
  mode: FocusMode,
  settings: FocusSettings,
): number {
  switch (mode) {
    case "focus":
      return settings.focusMinutes * MINUTE_MS;

    case "shortBreak":
      return settings.shortBreakMinutes * MINUTE_MS;

    case "longBreak":
      return settings.longBreakMinutes * MINUTE_MS;
  }
}

export function getRemainingMs(timer: FocusTimerRecord, now: Date): number {
  if (timer.status !== "running") {
    return Math.max(0, Math.min(timer.durationMs, timer.remainingMs));
  }

  if (!timer.endsAt) {
    throw new Error("A running timer must have an end time.");
  }

  return Math.max(
    0,
    Math.min(timer.durationMs, timer.endsAt.getTime() - now.getTime()),
  );
}

export function isTimerExpired(timer: FocusTimerRecord, now: Date): boolean {
  return timer.status === "running" && getRemainingMs(timer, now) === 0;
}

export function serializeFocusTimer(timer: FocusTimerRecord, now: Date) {
  return {
    mode: timer.mode,
    status: timer.status,
    cycleId: timer.cycleId,

    settings: {
      focusMinutes: timer.settings.focusMinutes,
      shortBreakMinutes: timer.settings.shortBreakMinutes,
      longBreakMinutes: timer.settings.longBreakMinutes,
    },

    durationMs: timer.durationMs,
    remainingMs: getRemainingMs(timer, now),

    startedAt: timer.startedAt?.toISOString() ?? null,
    endsAt: timer.endsAt?.toISOString() ?? null,

    completedFocusCount: timer.completedFocusCount,
    revision: timer.revision,

    serverNow: now.toISOString(),
  };
}

export type FocusTimerSnapshot = ReturnType<typeof serializeFocusTimer>;
