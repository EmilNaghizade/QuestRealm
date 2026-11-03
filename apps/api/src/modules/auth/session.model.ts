import { Schema, model } from 'mongoose'

const sessionSchema = new Schema(
  {
    tokenHash: {
      type: String,
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'QuestRealmV2User',
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'qr_v2_sessions',
    timestamps: true,
  },
)

sessionSchema.index(
  { tokenHash: 1 },
  {
    unique: true,
    name: 'qr_v2_sessions_token_unique',
  },
)

sessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: 'qr_v2_sessions_expiry',
  },
)

export const Session = model('QuestRealmV2Session', sessionSchema)