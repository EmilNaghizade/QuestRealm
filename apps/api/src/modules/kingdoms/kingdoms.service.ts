import type { Types } from "mongoose";
import { AppError } from "../../lib/app-error.js";
import { User, type UserRecord } from "../auth/user.model.js";
import { getProgression } from "../character/progression.js";

export const kingdoms = [
  { id: "oakridge", defense: 3, siegeSeconds: 30, name: "Oakridge", level: 1, gold: 75, description: "An old woodland settlement, waiting for someone who keeps their word.", chronicle: "The watchfires of Oakridge burn again. Your first foothold has become a home." },
  { id: "sunreach", defense: 8, siegeSeconds: 45, name: "Sunreach", level: 2, gold: 125, description: "Terraced fields and a quiet market beyond the eastern hills.", chronicle: "The gates of Sunreach open. A new road connects the valley to your realm." },
  { id: "mistwatch", defense: 18, siegeSeconds: 60, name: "Mistwatch", level: 3, gold: 200, description: "A forgotten lookout above the mist, earned through patient effort.", chronicle: "From Mistwatch, the path ahead is clearer. Your banner rises above the clouds." },
  { id: "ironvale", defense: 40, siegeSeconds: 90, name: "Ironvale", level: 5, gold: 300, description: "A mountain stronghold whose foundations were built to endure.", chronicle: "Ironvale stands with you. The work of many ordinary days has forged something lasting." },
  { id: "starfall", defense: 80, siegeSeconds: 120, name: "Starfall", level: 8, gold: 500, description: "A distant citadel where a long journey becomes a new beginning.", chronicle: "The bells of Starfall ring across your realm. This chapter is complete; another awaits." },
] as const;
export const troopTypes = [
  { id: "militia", name: "Militia", field: "troopMilitia", price: 15, power: 1, level: 0, description: "Local volunteers, ready to defend a growing realm." },
  { id: "rangers", name: "Rangers", field: "troopRangers", price: 40, power: 3, level: 1, description: "Patient scouts who know every path beyond the frontier." },
  { id: "knights", name: "Knights", field: "troopKnights", price: 90, power: 8, level: 2, description: "Seasoned companions whose resolve anchors your army." },
] as const;
function requiredXp(level: number) { return 125 * level * (level + 3); }
export function serializeKingdoms(user: Pick<UserRecord, "xp" | "gold" | "conqueredKingdoms"> & Partial<Pick<UserRecord, "troopMilitia" | "troopRangers" | "troopKnights" | "armyPower" | "siege">>) {
  const owned = user.conqueredKingdoms ?? [];
  const power = user.armyPower ?? 0;
  return {
    serverNow: new Date().toISOString(),
    siege: user.siege ? { kingdomId: user.siege.kingdomId, startedAt: new Date(user.siege.startedAt).toISOString(), endsAt: new Date(user.siege.endsAt).toISOString() } : null,
    army: { power, troops: troopTypes.map(troop => ({ id: troop.id, name: troop.name, price: troop.price, power: troop.power, level: troop.level, description: troop.description, count: user[troop.field] ?? 0 })) },
    regions: kingdoms.map((kingdom, index) => {
      const conquered = owned.includes(kingdom.id);
      const prerequisite = index > 0 ? kingdoms[index - 1]! : null;
      const hasPrevious = !prerequisite || owned.includes(prerequisite.id);
      const xpRequired = requiredXp(kingdom.level);
      const startXp = prerequisite ? requiredXp(prerequisite.level) : 0;
      return { ...kingdom, armyMet: power >= kingdom.defense, xpRequired, xpRemaining: Math.max(0, xpRequired - user.xp),
        progress: Math.max(0, Math.min(100, Math.floor((user.xp - startXp) / (xpRequired - startXp) * 100))),
        previousName: prerequisite?.name ?? null,
        status: conquered ? "conquered" : hasPrevious && user.xp >= xpRequired && power >= kingdom.defense ? "ready" : "locked",
        prerequisiteMet: hasPrevious,
      };
    }),
    balance: { xp: user.xp, gold: user.gold, progression: getProgression(user.xp) },
  };
}
export async function getKingdoms(userId: Types.ObjectId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  if (!user.characterId) throw new AppError(403, "CHARACTER_REQUIRED", "Choose your character first.");
  return serializeKingdoms(user);
}
export async function conquerKingdom(userId: Types.ObjectId, kingdomId: string) {
  const index = kingdoms.findIndex(item => item.id === kingdomId);
  const kingdom = kingdoms[index];
  if (!kingdom) throw new AppError(404, "KINGDOM_NOT_FOUND", "This kingdom could not be found.");
  const previous = kingdoms.slice(0, index).map(item => item.id);
  // Claim only a finished, server-timed siege. Record conquest and reward together.
  const user = await User.findOneAndUpdate(
    { _id: userId, characterId: { $ne: null }, xp: { $gte: requiredXp(kingdom.level) },
      "siege.kingdomId": kingdom.id, "siege.endsAt": { $lte: new Date() }, armyPower: { $gte: kingdom.defense },
      conqueredKingdoms: { $ne: kingdom.id, ...(previous.length ? { $all: previous } : {}) } },
    { $addToSet: { conqueredKingdoms: kingdom.id }, $inc: { gold: kingdom.gold }, $set: { siege: null } },
    { new: true, runValidators: true },
  );
  if (user) return { ...serializeKingdoms(user), conqueredId: kingdom.id, reward: { gold: kingdom.gold } };
  const state = await getKingdoms(userId);
  const region = state.regions.find(item => item.id === kingdom.id)!;
  if (region.status === "conquered") throw new AppError(409, "KINGDOM_ALREADY_CONQUERED", "This kingdom is already part of your realm. Its reward was granted once.");
  throw new AppError(409, "SIEGE_NOT_READY", "Start a siege and wait for it to finish before raising your banner.");
}

export async function recruitTroops(userId: Types.ObjectId, troopId: string, quantity: number) {
  const troop = troopTypes.find(item => item.id === troopId);
  if (!troop || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) throw new AppError(400, "INVALID_RECRUITMENT", "Choose a troop and 1–20 recruits.");
  const cost = troop.price * quantity;
  const user = await User.findOneAndUpdate(
    { _id: userId, characterId: { $ne: null }, gold: { $gte: cost }, xp: { $gte: requiredXp(troop.level) },
      $or: [{ [troop.field]: { $lte: 10000 - quantity } }, { [troop.field]: { $exists: false } }] },
    { $inc: { gold: -cost, [troop.field]: quantity, armyPower: troop.power * quantity } },
    { new: true, runValidators: true },
  );
  if (user) return serializeKingdoms(user);
  const state = await getKingdoms(userId);
  if (state.balance.progression.level < troop.level) throw new AppError(409, "TROOP_LEVEL_REQUIRED", "Reach this troop's required level first.");
  if (state.balance.gold < cost) throw new AppError(409, "INSUFFICIENT_GOLD", "You need more gold to recruit these soldiers.");
  throw new AppError(409, "ARMY_LIMIT", "You have reached the limit for this troop type.");
}
export async function startSiege(userId: Types.ObjectId, kingdomId: string) {
  const index = kingdoms.findIndex(item => item.id === kingdomId), kingdom = kingdoms[index];
  if (!kingdom) throw new AppError(404, "KINGDOM_NOT_FOUND", "This kingdom could not be found.");
  const now = new Date(), endsAt = new Date(now.getTime() + kingdom.siegeSeconds * 1000);
  const previous = kingdoms.slice(0, index).map(item => item.id);
  const user = await User.findOneAndUpdate(
    { _id: userId, characterId: { $ne: null }, siege: null, xp: { $gte: requiredXp(kingdom.level) }, armyPower: { $gte: kingdom.defense },
      conqueredKingdoms: { $ne: kingdom.id, ...(previous.length ? { $all: previous } : {}) } },
    { $set: { siege: { kingdomId: kingdom.id, startedAt: now, endsAt } } },
    { new: true, runValidators: true },
  );
  if (user) return serializeKingdoms(user);
  const state = await getKingdoms(userId);
  if (state.siege) throw new AppError(409, "SIEGE_ACTIVE", "Finish your current siege before starting another.");
  throw new AppError(409, "KINGDOM_LOCKED", "Meet the level, army strength and previous conquest requirements first.");
}
