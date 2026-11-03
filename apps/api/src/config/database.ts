import mongoose from "mongoose";
import { env } from "./env.js";
import { User } from "../modules/auth/user.model.js";
import { Session } from "../modules/auth/session.model.js";

mongoose.set("bufferCommands", false);
mongoose.set("autoCreate", false);
mongoose.set("autoIndex", false);

mongoose.connection.on("connected", () => {
  console.info("MongoDB connected.");
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("error", () => {
  console.error("MongoDB connection error.");
});

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
  });

  await User.createIndexes();
  await Session.createIndexes();

  console.info("Auth indexes are ready.");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export async function pingDatabase(): Promise<boolean> {
  if (mongoose.connection.readyState !== 1) {
    return false;
  }

  const database = mongoose.connection.db;

  if (!database) {
    return false;
  }

  try {
    await database.command({ ping: 1 }, { timeoutMS: 3_000 });

    return true;
  } catch {
    return false;
  }
}
