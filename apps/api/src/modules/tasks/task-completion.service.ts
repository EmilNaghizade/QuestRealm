import mongoose, { mongo, Types } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User } from "../auth/user.model.js";
import { getProgression } from "../character/progression.js";
import { Task } from "./task.model.js";
import { TaskCompletion } from "./task-completion.model.js";

const REWARDS = {
  easy: { xp: 20, gold: 10 },
  medium: { xp: 40, gold: 20 },
  hard: { xp: 60, gold: 30 },
} as const;

function getLocalDateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  function getPart(type: string): string {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new Error("Unable to calculate the local date.");
    }

    return value;
  }

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

function alreadyCompletedError(): AppError {
  return new AppError(
    409,
    "TASK_ALREADY_COMPLETED",
    "This quest has already been completed for this period.",
  );
}

export async function completeTask(userId: Types.ObjectId, taskId: string) {
  const completedAt = new Date();

  try {
    return await mongoose.connection.transaction(async (session) => {
      const user = await User.findById(userId).session(session);

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

      const task = await Task.findOneAndUpdate(
        {
          _id: new Types.ObjectId(taskId),
          userId,
          deletedAt: null,
        },
        {
          $inc: { completionVersion: 1 },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!task) {
        throw new AppError(
          404,
          "TASK_NOT_FOUND",
          "This quest could not be found.",
        );
      }

      const occurrenceKey =
        task.kind === "once"
          ? "once"
          : getLocalDateKey(completedAt, user.timeZone);

      const existingCompletion = await TaskCompletion.findOne({
        taskId: task._id,
        occurrenceKey,
      }).session(session);

      if (existingCompletion) {
        throw alreadyCompletedError();
      }

      const reward = REWARDS[task.difficulty];

      await TaskCompletion.create(
        [
          {
            userId,
            taskId: task._id,
            occurrenceKey,
            timeZone: user.timeZone,
            xp: reward.xp,
            gold: reward.gold,
            completedAt,
          },
        ],
        { session },
      );

      const updatedUser = await User.findOneAndUpdate(
        { _id: userId },
        {
          $inc: {
            xp: reward.xp,
            gold: reward.gold,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!updatedUser) {
        throw new AppError(
          401,
          "UNAUTHENTICATED",
          "Please sign in to continue.",
        );
      }

      return {
        taskId: task._id.toString(),
        occurrenceKey,
        completedAt: completedAt.toISOString(),
        reward,
        balance: {
          xp: updatedUser.xp,
          gold: updatedUser.gold,
          progression: getProgression(updatedUser.xp),
        },
      };
    });
  } catch (error) {
    if (error instanceof mongo.MongoServerError) {
      if (error.code === 11000) {
        throw alreadyCompletedError();
      }

      if (error.code === 20) {
        throw new AppError(
          503,
          "TRANSACTIONS_REQUIRED",
          "Quest rewards require a transaction-capable MongoDB deployment.",
        );
      }
    }

    throw error;
  }
}
