import { Schema, model, type Types } from "mongoose";

export interface FocusSessionRecord {
  userId: Types.ObjectId;
  cycleId: string;

  durationMs: number;

  startedAt: Date;
  completedAt: Date;

  timeZone: string;

  createdAt: Date;
  updatedAt: Date;
}

const focusSessionSchema = new Schema<FocusSessionRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "QuestRealmV2User",
    },

    cycleId: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 64,
    },

    durationMs: {
      type: Number,
      required: true,
      min: 60 * 1000,
      max: 180 * 60 * 1000,
      validate: {
        validator: Number.isSafeInteger,
        message: "durationMs must be a safe integer.",
      },
    },

    startedAt: {
      type: Date,
      required: true,
    },

    completedAt: {
      type: Date,
      required: true,
    },

    timeZone: {
      type: String,
      required: true,
      maxlength: 100,
      validate: {
        validator(value: string) {
          try {
            new Intl.DateTimeFormat("en-US", {
              timeZone: value,
            });

            return true;
          } catch {
            return false;
          }
        },
        message: "Invalid time zone.",
      },
    },
  },
  {
    collection: "qr_v2_focus_sessions",
    timestamps: true,
    strict: "throw",
  },
);

focusSessionSchema.index(
  { userId: 1, cycleId: 1 },
  {
    unique: true,
    name: "qr_v2_focus_sessions_cycle_unique",
  },
);

focusSessionSchema.index(
  { userId: 1, completedAt: -1, _id: -1 },
  {
    name: "qr_v2_focus_sessions_history",
  },
);

export const FocusSession = model<FocusSessionRecord>(
  "QuestRealmV2FocusSession",
  focusSessionSchema,
);
