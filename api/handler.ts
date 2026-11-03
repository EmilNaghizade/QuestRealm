import type { IncomingMessage, ServerResponse } from "node:http";
import { app } from "../apps/api/src/app.js";
import { connectDatabase } from "../apps/api/src/config/database.js";

let connectionPromise: Promise<void> | undefined;

function ensureDatabaseConnection(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = connectDatabase().catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    await ensureDatabaseConnection();
  } catch {
    console.error("Unable to initialize the database connection.");

    response.statusCode = 503;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Cache-Control", "no-store");

    response.end(
      JSON.stringify({
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "The service is temporarily unavailable. Please try again.",
        },
      }),
    );

    return;
  }

  app(request, response);
}
