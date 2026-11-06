import { Schema, model } from "mongoose";

export interface UserRecord {
  displayName: string;
  email: string;
  passwordHash: string;
  timeZone: string;
  language: "en" | "az" | "tr" | "ru";
  selectedReadingId:string|null;
  characterId: string | null;
  xp: number;
  gold: number;
  ownedItems: string[];
  conqueredKingdoms: string[];
  achievementIds: string[];
  troopMilitia: number;
  troopRangers: number;
  troopKnights: number;
  armyPower: number;
  siege: { kingdomId: string; startedAt: Date; endsAt: Date } | null;
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

    selectedReadingId:{type:String,default:null},
    language: { type: String, enum: ["en", "az", "tr", "ru"], default: "en" },
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

    troopMilitia: { type: Number, default: 0, min: 0, max: 10000, validate: Number.isSafeInteger },
    troopRangers: { type: Number, default: 0, min: 0, max: 10000, validate: Number.isSafeInteger },
    troopKnights: { type: Number, default: 0, min: 0, max: 10000, validate: Number.isSafeInteger },
    armyPower: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    siege: { type: new Schema({ kingdomId: { type: String, required: true }, startedAt: { type: Date, required: true }, endsAt: { type: Date, required: true } }, { _id: false }), default: null },
    achievementIds: { type: [String], default: [] },
    conqueredKingdoms: { type: [String], default: [] },
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
