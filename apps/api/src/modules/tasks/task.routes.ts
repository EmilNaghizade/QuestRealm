import { Router, type Request } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { findSession } from "../auth/session.js";
import { User } from "../auth/user.model.js";
import {
  createTaskSchema,
  listTasksSchema,
  taskIdSchema,
} from "./task.validation.js";
import { createTask, deleteTask, listTasks } from "./task.service.js";

export const taskRouter = Router();

async function requireTaskUser(request: Request) {
  const session = await findSession(request);

  if (!session) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  const user = await User.findById(session.userId);

  if (!user) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  if (!user.characterId) {
    throw new AppError(
      403,
      "CHARACTER_REQUIRED",
      "Choose your adventurer first.",
    );
  }

  return user;
}

taskRouter.use((request, response, next) => {
  response.setHeader("Cache-Control", "no-store");

  if (
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    request.get("origin") !== env.WEB_ORIGIN
  ) {
    next(
      new AppError(
        403,
        "ORIGIN_NOT_ALLOWED",
        "The request origin is not allowed.",
      ),
    );
    return;
  }

  next();
});

taskRouter.get("/", async (request, response, next) => {
  try {
    const user = await requireTaskUser(request);
    const result = listTasksSchema.safeParse(request.query);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Invalid query.",
      );
    }

    const page = await listTasks(user._id, result.data.cursor);

    response.json(page);
  } catch (error) {
    next(error);
  }
});

taskRouter.post("/", async (request, response, next) => {
  try {
    const user = await requireTaskUser(request);

    if (!request.is("application/json")) {
      throw new AppError(
        415,
        "JSON_REQUIRED",
        "Use application/json for this request.",
      );
    }

    const result = createTaskSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Check your quest details.",
      );
    }

    const task = await createTask(user._id, result.data);

    response.status(201).json({
      data: { task },
    });
  } catch (error) {
    next(error);
  }
});

taskRouter.delete("/:taskId", async (request, response, next) => {
  try {
    const user = await requireTaskUser(request);
    const result = taskIdSchema.safeParse(request.params.taskId);

    if (!result.success) {
      throw new AppError(400, "VALIDATION_ERROR", "Invalid task ID.");
    }

    await deleteTask(user._id, result.data);

    response.status(204).end();
  } catch (error) {
    next(error);
  }
});
