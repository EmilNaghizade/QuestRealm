import { Schema, model } from "mongoose";

export interface UserRecord {
  displayName: string;
  email: string;
  passwordHash: string;
  timeZone: string;
  characterId: string | null;
  xp: number;
  gold: number;
  ownedItems: string[];
  equippedWeapon: string | null;
  equippedArmor: string | null;
  equippedCharm: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserRecord>(
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

    ownedItems: { type: [String], default: [] },
    equippedWeapon: { type: String, default: null },
    equippedArmor: { type: String, default: null },
    equippedCharm: { type: String, default: null },

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

export const User = model<UserRecord>("QuestRealmV2User", userSchema);
