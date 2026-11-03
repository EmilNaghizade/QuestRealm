import { z } from "zod";

const revisionSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const focusModeSchema = z.enum(["focus", "shortBreak", "longBreak"]);

export const focusSettingsSchema = z
  .object({
    focusMinutes: z
      .number()
      .int()
      .min(1, "Focus duration must be at least 1 minute.")
      .max(180, "Focus duration cannot exceed 180 minutes."),

    shortBreakMinutes: z
      .number()
      .int()
      .min(1, "Short break must be at least 1 minute.")
      .max(60, "Short break cannot exceed 60 minutes."),

    longBreakMinutes: z
      .number()
      .int()
      .min(1, "Long break must be at least 1 minute.")
      .max(120, "Long break cannot exceed 120 minutes."),
  })
  .strict();

export const updateFocusSettingsSchema = z
  .object({
    expectedRevision: revisionSchema,
    settings: focusSettingsSchema,
  })
  .strict();

export const focusActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("start"),
      expectedRevision: revisionSchema,
    })
    .strict(),

  z
    .object({
      action: z.literal("pause"),
      expectedRevision: revisionSchema,
    })
    .strict(),

  z
    .object({
      action: z.literal("resume"),
      expectedRevision: revisionSchema,
    })
    .strict(),

  z
    .object({
      action: z.literal("reset"),
      expectedRevision: revisionSchema,
    })
    .strict(),

  z
    .object({
      action: z.literal("switchMode"),
      expectedRevision: revisionSchema,
      mode: focusModeSchema,
    })
    .strict(),
]);

export const focusHistoryQuerySchema = z
  .object({
    cursor: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid history cursor.")
      .optional(),
  })
  .strict();

export type FocusSettingsInput = z.infer<typeof focusSettingsSchema>;

export type UpdateFocusSettingsInput = z.infer<
  typeof updateFocusSettingsSchema
>;

export type FocusActionInput = z.infer<typeof focusActionSchema>;

export type FocusHistoryQuery = z.infer<typeof focusHistoryQuerySchema>;
