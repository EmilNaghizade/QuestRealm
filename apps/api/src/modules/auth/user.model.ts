import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 40,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    timeZone: {
      type: String,
      required: true,
      default: "UTC",
    },

    characterId: {
      type: String,
      default: null,
    },

    xp: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    gold: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    collection: "qr_v2_users",
    timestamps: true,
    strict: "throw",

    toJSON: {
      transform(_document, result) {
        Reflect.deleteProperty(result, "passwordHash");
        Reflect.deleteProperty(result, "__v");

        return result;
      },
    },
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: "qr_v2_users_email_unique",
  },
);

export type UserRecord = InferSchemaType<typeof userSchema>;

export const User = model("QuestRealmV2User", userSchema);
