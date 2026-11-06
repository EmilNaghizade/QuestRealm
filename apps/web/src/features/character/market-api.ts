import { apiRequest } from "../../lib/api";
import type { PlayerBalance } from "../auth/auth-api";
export type EquipmentSlot = "weapon" | "armor" | "charm";
export type MarketItem = { id: string; name: string; slot: EquipmentSlot; price: number; description: string };
export type MarketState = { items: MarketItem[]; ownedIds: string[]; equipped: Record<EquipmentSlot, string | null>; balance: PlayerBalance };
export async function getMarket(signal?: AbortSignal): Promise<MarketState> {
  return (await apiRequest<{ data: MarketState }>("/market", { signal })).data;
}
export async function buyItem(id: string): Promise<MarketState> {
  return (await apiRequest<{ data: MarketState }>(`/market/${encodeURIComponent(id)}/buy`, { method: "POST" })).data;
}
export async function equipItem(slot: EquipmentSlot, itemId: string | null): Promise<MarketState> {
  return (await apiRequest<{ data: MarketState }>("/market/equipment", { method: "PATCH", json: { slot, itemId } })).data;
}
