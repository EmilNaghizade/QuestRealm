import { Schema, model, type Types } from "mongoose";

export type FocusMode = "focus" | "shortBreak" | "longBreak";

export type FocusStatus = "idle" | "running" | "paused";

export interface FocusSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export interface FocusTimerRecord {
  userId: Types.ObjectId;

  settings: FocusSettings;

  mode: FocusMode;
  status: FocusStatus;

  cycleId: string | null;

  durationMs: number;
  remainingMs: number;

  startedAt: Date | null;
  endsAt: Date | null;

  completedFocusCount: number;

  revision: number;

  createdAt: Date;
  updatedAt: Date;
}

const integerValidator = {
  validator: Number.isSafeInteger,
  message: "{PATH} must be a safe integer.",
};

const settingsSchema = new Schema<FocusSettings>(
  {
    focusMinutes: {
      type: Number,
      required: true,
      default: 25,
      min: 1,
      max: 180,
      validate: integerValidator,
    },

    shortBreakMinutes: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
      max: 60,
      validate: integerValidator,
    },

    longBreakMinutes: {
      type: Number,
      required: true,
      default: 15,
      min: 1,
      max: 120,
      validate: integerValidator,
    },
  },
  {
    _id: false,
    strict: "throw",
  },
);

const focusTimerSchema = new Schema<FocusTimerRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "QuestRealmV2User",
    },

    settings: {
      type: settingsSchema,
      required: true,
      default: () => ({}),
    },

    mode: {
      type: String,
      required: true,
      enum: ["focus", "shortBreak", "longBreak"],
      default: "focus",
    },

    status: {
      type: String,
      required: true,
      enum: ["idle", "running", "paused"],
      default: "idle",
    },

    cycleId: {
      type: String,
      default: null,
    },

    durationMs: {
      type: Number,
      required: true,
      default: 25 * 60 * 1000,
      min: 1,
      max: 180 * 60 * 1000,
      validate: integerValidator,
    },

    remainingMs: {
      type: Number,
      required: true,
      default: 25 * 60 * 1000,
      min: 0,
      max: 180 * 60 * 1000,
      validate: integerValidator,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    endsAt: {
      type: Date,
      default: null,
    },

    completedFocusCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
  },
  {
    collection: "qr_v2_focus_timers",
    timestamps: true,
    strict: "throw",
    versionKey: "revision",
    optimisticConcurrency: true,
  },
);

focusTimerSchema.index(
  { userId: 1 },
  {
    unique: true,
    name: "qr_v2_focus_timers_user_unique",
  },
);

export const FocusTimer = model<FocusTimerRecord>(
  "QuestRealmV2FocusTimer",
  focusTimerSchema,
);
