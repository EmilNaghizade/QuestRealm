import { Schema, model, type Types } from "mongoose";

export interface TaskRecord {
  userId: Types.ObjectId;
  title: string;
  kind: "daily" | "once";
  difficulty: "easy" | "medium" | "hard";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "QuestRealmV2User",
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },

    kind: {
      type: String,
      required: true,
      enum: ["daily", "once"],
    },

    difficulty: {
      type: String,
      required: true,
      enum: ["easy", "medium", "hard"],
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "qr_v2_tasks",
    timestamps: true,
    strict: "throw",
  },
);

taskSchema.index(
  { userId: 1, deletedAt: 1, _id: -1 },
  { name: "qr_v2_tasks_owner_list" },
);

export const Task = model<TaskRecord>("QuestRealmV2Task", taskSchema);
