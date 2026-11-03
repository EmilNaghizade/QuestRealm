import type { Server } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

let server: Server | undefined;
let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.info(`${signal} received. Closing the API...`);

  const timeout = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10_000);

  timeout.unref();

  try {
    if (server?.listening) {
      const activeServer = server;

      await new Promise<void>((resolve, reject) => {
        activeServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await disconnectDatabase();

    console.info("API closed.");
  } catch {
    console.error("Failed to shut down cleanly.");
    process.exitCode = 1;
  } finally {
    clearTimeout(timeout);
  }
}

async function start(): Promise<void> {
  try {
    await connectDatabase();

    if (isShuttingDown) {
      await disconnectDatabase();
      return;
    }

    server = app.listen(env.PORT, () => {
      console.info(`QuestRealm API is running on http://localhost:${env.PORT}`);
    });

    server.on("error", () => {
      console.error(
        "API server error. Check whether the configured port is available.",
      );

      process.exitCode = 1;
      void shutdown("SERVER_ERROR");
    });
  } catch {
    console.error(
      "API startup failed. Check MongoDB credentials, network access and connection settings.",
    );

    process.exitCode = 1;
    await shutdown("STARTUP_ERROR");
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void start();
