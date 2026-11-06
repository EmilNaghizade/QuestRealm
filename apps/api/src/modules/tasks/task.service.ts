import { Types, type PipelineStage } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User } from "../auth/user.model.js";
import { Task, type TaskRecord } from "./task.model.js";
import { TaskCompletion } from "./task-completion.model.js";
import type { CreateTaskInput, ListTasksInput } from "./task.validation.js";

const PAGE_SIZE = 20;

type TaskFilters = Pick<ListTasksInput, "kind" | "difficulty" | "status">;

type ListedTask = TaskRecord & {
  _id: Types.ObjectId;
  isCompleted: boolean;
};

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
    canChangeKind: (task.completionVersion ?? 0) === 0,
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

export async function listTasks(
  userId: Types.ObjectId,
  cursor?: string,
  filters: TaskFilters = {},
) {
  const user = await User.findById(userId).select("timeZone").lean();

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  const today = getLocalDateKey(new Date(), user.timeZone);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId,
        deletedAt: null,
        ...(cursor ? { _id: { $lt: new Types.ObjectId(cursor) } } : {}),
        ...(filters.kind ? { kind: filters.kind } : {}),
        ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
      },
    },
    {
      $sort: { _id: -1 },
    },
  ];

  // Without a completion filter, only inspect the next page.
  if (!filters.status) {
    pipeline.push({
      $limit: PAGE_SIZE + 1,
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: TaskCompletion.collection.name,
        let: {
          currentTaskId: "$_id",
          currentOccurrenceKey: {
            $cond: [{ $eq: ["$kind", "once"] }, "once", today],
          },
        },
        pipeline: [
          {
            $match: {
              userId,
              $expr: {
                $and: [
                  { $eq: ["$taskId", "$$currentTaskId"] },
                  {
                    $eq: ["$occurrenceKey", "$$currentOccurrenceKey"],
                  },
                ],
              },
            },
          },
          {
            $limit: 1,
          },
          {
            $project: { _id: 1 },
          },
        ],
        as: "matchingCompletions",
      },
    },
    {
      $set: {
        isCompleted: {
          $gt: [{ $size: "$matchingCompletions" }, 0],
        },
      },
    },
  );

  // Apply completion status before pagination.
  if (filters.status) {
    pipeline.push(
      {
        $match: {
          isCompleted: filters.status === "completed",
        },
      },
      {
        $limit: PAGE_SIZE + 1,
      },
    );
  }

  pipeline.push({
    $project: {
      matchingCompletions: 0,
    },
  });

  const tasks = await Task.aggregate<ListedTask>(pipeline);

  const hasMore = tasks.length > PAGE_SIZE;
  const page = tasks.slice(0, PAGE_SIZE);
  const lastTask = page[page.length - 1];

  return {
    data: {
      tasks: page.map((task) => serializeTask(task, task.isCompleted)),
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

export async function updateTask(userId: Types.ObjectId, taskId: string, input: CreateTaskInput) {
  const user = await User.findById(userId).select("timeZone").lean();
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  const ownerFilter = { _id: new Types.ObjectId(taskId), userId, deletedAt: null };
  const current = await Task.findOne(ownerFilter).lean();
  if (!current) throw new AppError(404, "TASK_NOT_FOUND", "This quest could not be found.");
  const occurrenceKey = current.kind === "once" ? "once" : getLocalDateKey(new Date(), user.timeZone);
  const completion = await TaskCompletion.exists({ userId, taskId: current._id, occurrenceKey });
  if (completion) throw new AppError(409, "TASK_COMPLETED", "Completed quests cannot be edited.");
  if (current.kind !== input.kind && (current.completionVersion ?? 0) > 0) {
    throw new AppError(409, "TASK_KIND_LOCKED", "The repeat type cannot change after a quest has been completed.");
  }
  // Completion increments this version atomically. Refuse an edit if a completion
  // committed after the check above, including one from another tab.
  const task = await Task.findOneAndUpdate(
    { ...ownerFilter, kind: current.kind, completionVersion: current.completionVersion ?? { $exists: false } },
    { $set: { title: input.title, kind: input.kind, difficulty: input.difficulty } },
    { new: true, runValidators: true },
  );
  if (!task) throw new AppError(409, "TASK_CHANGED", "This quest changed. Refresh your quests before editing.");
  return serializeTask(task, false);
}
