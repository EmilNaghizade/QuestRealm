import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { pingDatabase } from "./config/database.js";
import { AppError } from "./lib/app-error.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { characterRouter } from "./modules/character/character.routes.js";
import { taskRouter } from "./modules/tasks/task.routes.js";
import { focusRouter } from "./modules/focus/focus.routes.js";

import { marketRouter } from "./modules/market/market.routes.js";

import { kingdomsRouter } from "./modules/kingdoms/kingdoms.routes.js";

import { achievementsRouter } from "./modules/achievements/achievements.routes.js";

import { libraryRouter } from "./modules/library/library.routes.js";

export const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

app.get("/api/v1/health", (_request, response) => {
  response.status(200).json({
    data: {
      status: "ok",
      service: "questrealm-api",
    },
  });
});

app.get("/api/v1/ready", async (_request, response, next) => {
  try {
    const databaseReady = await pingDatabase();

    if (!databaseReady) {
      next(
        new AppError(
          503,
          "DATABASE_UNAVAILABLE",
          "The service is temporarily unavailable.",
        ),
      );
      return;
    }

    response.status(200).json({
      data: {
        status: "ready",
        database: "connected",
      },
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/characters", characterRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/focus", focusRouter);
app.use("/api/v1/market", marketRouter);
app.use("/api/v1/kingdoms", kingdomsRouter);
app.use("/api/v1/achievements", achievementsRouter);
app.use("/api/v1/library", libraryRouter);

if (env.NODE_ENV === "production") {
  const webDirectory = fileURLToPath(
    new URL("../../web/dist/", import.meta.url),
  );

  app.use(
    express.static(webDirectory, {
      index: "index.html",
      dotfiles: "ignore",
      setHeaders(response) {
        response.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
}

app.use((_request, _response, next) => {
  next(
    new AppError(
      404,
      "NOT_FOUND",
      "The requested resource could not be found.",
    ),
  );
});

app.use(errorHandler);