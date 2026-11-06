import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .max(254, "Email is too long.")
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(6, "Use at least 6 characters.")
  .max(128, "Use no more than 128 characters.");

const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "Time zone is required.")
  .max(100, "Time zone is too long.")
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", {
        timeZone: value,
      }).format();

      return true;
    } catch {
      return false;
    }
  }, "Select a valid time zone.");

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, "Use at least 2 characters.")
      .max(40, "Use no more than 40 characters."),

    email: emailSchema,
    password: passwordSchema,
    timeZone: timeZoneSchema,
    language: z.enum(["en", "az", "tr", "ru"]).default("en"),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const profileSchema = z.object({ displayName: registerSchema.shape.displayName, timeZone: timeZoneSchema, language: z.enum(["en", "az", "tr", "ru"]) }).strict();
