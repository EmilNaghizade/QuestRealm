import type { Types } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User, type UserRecord } from "../auth/user.model.js";
import { getProgression } from "../character/progression.js";

export const marketItems = [
  { id: "oak-staff", name: "Oak staff", slot: "weapon", price: 60, description: "A steady companion for a curious mind." },
  { id: "steel-sword", name: "Steel sword", slot: "weapon", price: 150, description: "A reminder to face your next challenge with resolve." },
  { id: "travel-cloak", name: "Travel cloak", slot: "armor", price: 50, description: "For the small journeys that make a bigger story." },
  { id: "steel-armor", name: "Steel armor", slot: "armor", price: 180, description: "A symbol of the habits you have built, one day at a time." },
  { id: "compass", name: "Pocket compass", slot: "charm", price: 40, description: "Keep your direction when the path feels uncertain." },
  { id: "sunstone", name: "Sunstone pendant", slot: "charm", price: 100, description: "Carry a little light into your next chapter." },
] as const;
export type EquipmentSlot = "weapon" | "armor" | "charm";
const slotFields = { weapon: "equippedWeapon", armor: "equippedArmor", charm: "equippedCharm" } as const;
function serializeMarket(user: UserRecord) {
  return {
    items: marketItems,
    ownedIds: user.ownedItems ?? [],
    equipped: { weapon: user.equippedWeapon ?? null, armor: user.equippedArmor ?? null, charm: user.equippedCharm ?? null },
    balance: { xp: user.xp, gold: user.gold, progression: getProgression(user.xp) },
  };
}
export async function getMarket(userId: Types.ObjectId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  if (!user.characterId) throw new AppError(403, "CHARACTER_REQUIRED", "Choose your character first.");
  return serializeMarket(user);
}
export async function buyItem(userId: Types.ObjectId, itemId: string) {
  const item = marketItems.find(item => item.id === itemId);
  if (!item) throw new AppError(404, "ITEM_NOT_FOUND", "This item is not available.");
  // Debit and ownership change together; concurrent purchases cannot double-charge.
  const user = await User.findOneAndUpdate(
    { _id: userId, characterId: { $ne: null }, gold: { $gte: item.price }, ownedItems: { $ne: item.id } },
    { $inc: { gold: -item.price }, $addToSet: { ownedItems: item.id } },
    { new: true, runValidators: true },
  );
  if (user) return serializeMarket(user);
  const current = await getMarket(userId);
  if (current.ownedIds.includes(item.id)) throw new AppError(409, "ITEM_ALREADY_OWNED", "You already own this item.");
  throw new AppError(409, "INSUFFICIENT_GOLD", "You need more gold to buy this item.");
}
export async function equipItem(userId: Types.ObjectId, slot: EquipmentSlot, itemId: string | null) {
  if (itemId !== null && !marketItems.some(item => item.id === itemId && item.slot === slot)) {
    throw new AppError(400, "INVALID_EQUIPMENT", "Choose an item for this equipment slot.");
  }
  const user = await User.findOneAndUpdate(
    { _id: userId, characterId: { $ne: null }, ...(itemId ? { ownedItems: itemId } : {}) },
    { $set: { [slotFields[slot]]: itemId } },
    { new: true, runValidators: true },
  );
  if (!user) {
    await getMarket(userId);
    throw new AppError(403, "ITEM_NOT_OWNED", "Buy this item before equipping it.");
  }
  return serializeMarket(user);
}
