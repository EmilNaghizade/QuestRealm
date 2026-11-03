import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.info(`QuestRealm API is running on http://localhost:${env.PORT}`);
});

server.on("error", (error) => {
  console.error("Failed to start the API:", error);
  process.exit(1);
});

let isShuttingDown = false;

function shutdown(signal: string) {
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

  server.close((error) => {
    clearTimeout(timeout);

    if (error) {
      console.error("Failed to close the API:", error);
      process.exitCode = 1;
      return;
    }

    console.info("API closed.");
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
