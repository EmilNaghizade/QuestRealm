import type { IncomingMessage, ServerResponse } from "node:http";
import { app } from "../apps/api/src/app.js";
import { connectDatabase } from "../apps/api/src/config/database.js";

type VercelIncomingMessage = IncomingMessage & {
  query?: Record<string, unknown>;
};

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

function removeRoutingParameter(request: IncomingMessage): void {
  const url = new URL(request.url ?? "/", "https://questrealm.invalid");

  if (url.searchParams.has("path")) {
    url.searchParams.delete("path");

    request.url = `${url.pathname}${url.search}`;
  }

  // Vercel may also expose a previously parsed query object.
  const runtimeQuery = (request as VercelIncomingMessage).query;

  if (runtimeQuery && typeof runtimeQuery === "object") {
    Reflect.deleteProperty(runtimeQuery, "path");
  }
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  removeRoutingParameter(request);

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
