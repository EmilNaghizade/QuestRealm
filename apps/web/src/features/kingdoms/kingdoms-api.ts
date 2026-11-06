import { apiRequest } from "../../lib/api";
import type { PlayerBalance } from "../auth/auth-api";
export type Kingdom = { defense: number; siegeSeconds: number; armyMet: boolean; id: string; name: string; level: number; gold: number; description: string; chronicle: string; xpRequired: number; xpRemaining: number; progress: number; previousName: string | null; prerequisiteMet: boolean; status: "locked" | "ready" | "conquered" };
export type Troop = { id: string; name: string; price: number; power: number; level: number; description: string; count: number };
export type KingdomState = { serverNow: string; siege: { kingdomId: string; startedAt: string; endsAt: string } | null; army: { power: number; troops: Troop[] }; regions: Kingdom[]; balance: PlayerBalance };
export async function getKingdoms(signal?: AbortSignal): Promise<KingdomState> {
  return (await apiRequest<{ data: KingdomState }>("/kingdoms", { signal })).data;
}
export async function conquerKingdom(id: string): Promise<KingdomState & { conqueredId: string; reward: { gold: number } }> {
  return (await apiRequest<{ data: KingdomState & { conqueredId: string; reward: { gold: number } } }>(`/kingdoms/${encodeURIComponent(id)}/conquer`, { method: "POST" })).data;
}

export async function recruitTroops(troopId: string, quantity: number): Promise<KingdomState> {
  return (await apiRequest<{ data: KingdomState }>("/kingdoms/army/recruit", { method: "POST", json: { troopId, quantity } })).data;
}
export async function startSiege(id: string): Promise<KingdomState> {
  return (await apiRequest<{ data: KingdomState }>(`/kingdoms/${encodeURIComponent(id)}/siege`, { method: "POST" })).data;
}
