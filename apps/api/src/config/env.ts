import "dotenv/config";
import { z } from "zod";

const vercelHost =
  process.env.VERCEL_ENV === "preview"
    ? process.env.VERCEL_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL;

const inferredWebOrigin =
  process.env.VERCEL === "1" && vercelHost
    ? `https://${vercelHost}`
    : undefined;

const localWebOrigin =
  process.env.NODE_ENV !== "production" ? "http://localhost:5173" : undefined;

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  WEB_ORIGIN: z
    .string()
    .url()
    .transform((value) => new URL(value).origin),

  MONGODB_URI: z
    .string()
    .trim()
    .min(1, "MONGODB_URI is required.")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a MongoDB connection string.",
    ),
});

const result = envSchema.safeParse({
  ...process.env,

  WEB_ORIGIN:
    process.env.WEB_ORIGIN?.trim() || inferredWebOrigin || localWebOrigin,
});

if (!result.success) {
  console.error("Invalid environment configuration:");

  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

export const env = result.data;
