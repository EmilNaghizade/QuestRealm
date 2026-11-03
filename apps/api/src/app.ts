import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { AppError } from "./lib/app-error.js";
import { errorHandler } from "./middleware/error-handler.js";

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

app.get("/api/v1/health", (_request, response) => {
  response.status(200).json({
    data: {
      status: "ok",
      service: "questrealm-api",
    },
  });
});

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
