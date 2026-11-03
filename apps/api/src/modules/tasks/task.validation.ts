import { z } from "zod";

export const taskIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid task ID.");

export const createTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a quest title.")
      .max(120, "Use no more than 120 characters."),

    kind: z.enum(["daily", "once"]),

    difficulty: z.enum(["easy", "medium", "hard"]),
  })
  .strict();

export const listTasksSchema = z
  .object({
    cursor: taskIdSchema.optional(),
  })
  .strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
