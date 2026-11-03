import { Schema, model } from "mongoose";

const taskCompletionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "QuestRealmV2User",
    },

    taskId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "QuestRealmV2Task",
    },

    occurrenceKey: {
      type: String,
      required: true,
    },

    timeZone: {
      type: String,
      required: true,
    },

    xp: {
      type: Number,
      required: true,
      min: 0,
    },

    gold: {
      type: Number,
      required: true,
      min: 0,
    },

    completedAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "qr_v2_task_completions",
    timestamps: true,
    strict: "throw",
  },
);

taskCompletionSchema.index(
  { taskId: 1, occurrenceKey: 1 },
  {
    unique: true,
    name: "qr_v2_task_occurrence_unique",
  },
);

taskCompletionSchema.index(
  { userId: 1, completedAt: -1 },
  { name: "qr_v2_completion_history" },
);

export const TaskCompletion = model(
  "QuestRealmV2TaskCompletion",
  taskCompletionSchema,
);
