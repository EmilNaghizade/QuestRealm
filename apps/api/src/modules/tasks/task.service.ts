import { Types } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { Task, type TaskRecord } from "./task.model.js";
import type { CreateTaskInput } from "./task.validation.js";

const PAGE_SIZE = 20;

function serializeTask(task: TaskRecord & { _id: Types.ObjectId }) {
  return {
    id: task._id.toString(),
    title: task.title,
    kind: task.kind,
    difficulty: task.difficulty,
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

  return serializeTask(task);
}

export async function listTasks(userId: Types.ObjectId, cursor?: string) {
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

  return {
    data: {
      tasks: page.map(serializeTask),
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
