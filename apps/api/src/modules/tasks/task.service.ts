import { Types } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User } from "../auth/user.model.js";
import { Task, type TaskRecord } from "./task.model.js";
import { TaskCompletion } from "./task-completion.model.js";
import type { CreateTaskInput } from "./task.validation.js";

const PAGE_SIZE = 20;

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

function serializeTask(
  task: TaskRecord & { _id: Types.ObjectId },
  isCompleted: boolean,
) {
  return {
    id: task._id.toString(),
    title: task.title,
    kind: task.kind,
    difficulty: task.difficulty,
    isCompleted,
    createdAt: task.createdAt.toISOString(),
  };
}

export async function createTask(
  userId: Types.ObjectId,
  input: CreateTaskInput,
) {
  const task = await Task.create({
    userId,
    title: input.title,
    kind: input.kind,
    difficulty: input.difficulty,
  });

  return serializeTask(task, false);
}

export async function listTasks(userId: Types.ObjectId, cursor?: string) {
  const user = await User.findById(userId).select("timeZone").lean();

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  const today = getLocalDateKey(new Date(), user.timeZone);

  const tasks = await Task.find({
    userId,
    deletedAt: null,
    ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
  })
    .sort({ _id: -1 })
    .limit(PAGE_SIZE + 1)
    .lean();

  const hasMore = tasks.length > PAGE_SIZE;
  const page = tasks.slice(0, PAGE_SIZE);
  const lastTask = page[page.length - 1];

  const completions = page.length
    ? await TaskCompletion.find({
        userId,
        taskId: {
          $in: page.map((task) => task._id),
        },
        occurrenceKey: {
          $in: ["once", today],
        },
      })
        .select("taskId occurrenceKey")
        .lean()
    : [];

  const completedOccurrences = new Set(
    completions.map(
      (completion) =>
        `${completion.taskId.toString()}:${completion.occurrenceKey}`,
    ),
  );

  return {
    data: {
      tasks: page.map((task) => {
        const occurrenceKey = task.kind === "once" ? "once" : today;

        const isCompleted = completedOccurrences.has(
          `${task._id.toString()}:${occurrenceKey}`,
        );

        return serializeTask(task, isCompleted);
      }),
    },

    meta: {
      nextCursor: hasMore && lastTask ? lastTask._id.toString() : null,
    },
  };
}

export async function deleteTask(
  userId: Types.ObjectId,
  taskId: string,
): Promise<void> {
  const result = await Task.updateOne(
    {
      _id: new Types.ObjectId(taskId),
      userId,
      deletedAt: null,
    },
    {
      $set: {
        deletedAt: new Date(),
      },
    },
    {
      runValidators: true,
    },
  );

  if (result.matchedCount === 0) {
    throw new AppError(404, "TASK_NOT_FOUND", "This quest could not be found.");
  }
}
