import { Router, type ErrorRequestHandler, type Request } from "express";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/app-error.js";
import { findSession } from "../auth/session.js";
import {
  FocusConflictError,
  getFocusTimer,
  performFocusAction,
  updateFocusSettings,
} from "./focus.service.js";
import { getFocusStatistics, listFocusHistory } from "./focus-stats.service.js";
import {
  focusActionSchema,
  focusHistoryQuerySchema,
  updateFocusSettingsSchema,
} from "./focus.validation.js";

export const focusRouter = Router();

async function requireFocusUser(request: Request) {
  const session = await findSession(request);

  if (!session) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  return session.userId;
}

focusRouter.use((request, response, next) => {
  response.setHeader("Cache-Control", "no-store");

  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  if (request.get("origin") !== env.WEB_ORIGIN) {
    next(
      new AppError(
        403,
        "ORIGIN_NOT_ALLOWED",
        "The request origin is not allowed.",
      ),
    );
    return;
  }

  if (!request.is("application/json")) {
    next(
      new AppError(
        415,
        "JSON_REQUIRED",
        "Use application/json for this request.",
      ),
    );
    return;
  }

  next();
});

focusRouter.get("/", async (request, response, next) => {
  try {
    const userId = await requireFocusUser(request);
    const timer = await getFocusTimer(userId);

    response.json({
      data: { timer },
    });
  } catch (error) {
    next(error);
  }
});

focusRouter.get("/stats", async (request, response, next) => {
  try {
    const userId = await requireFocusUser(request);
    const statistics = await getFocusStatistics(userId);

    response.json(statistics);
  } catch (error) {
    next(error);
  }
});

focusRouter.get("/history", async (request, response, next) => {
  try {
    const userId = await requireFocusUser(request);

    const result = focusHistoryQuerySchema.safeParse(request.query);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Invalid history query.",
      );
    }

    const history = await listFocusHistory(userId, result.data.cursor);

    response.json(history);
  } catch (error) {
    next(error);
  }
});

focusRouter.post("/actions", async (request, response, next) => {
  try {
    const userId = await requireFocusUser(request);
    const result = focusActionSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Check your timer action.",
      );
    }

    const timer = await performFocusAction(userId, result.data);

    response.json({
      data: { timer },
    });
  } catch (error) {
    next(error);
  }
});

focusRouter.patch("/settings", async (request, response, next) => {
  try {
    const userId = await requireFocusUser(request);
    const result = updateFocusSettingsSchema.safeParse(request.body);

    if (!result.success) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Check your focus settings.",
      );
    }

    const timer = await updateFocusSettings(userId, result.data);

    response.json({
      data: { timer },
    });
  } catch (error) {
    next(error);
  }
});

const handleFocusConflict: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  next,
) => {
  if (!(error instanceof FocusConflictError)) {
    next(error);
    return;
  }

  response.status(error.statusCode).json({
    error: {
      code: error.code,
      message: error.message,
    },
    data: {
      timer: error.timer,
    },
  });
};

focusRouter.use(handleFocusConflict);
