import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import type { PlayerBalance } from "../auth/auth-api";
import { buyItem, equipItem, getMarket, type EquipmentSlot, type MarketItem, type MarketState } from "./market-api";
const slots: { id: EquipmentSlot; label: string }[] = [{ id: "weapon", label: "Weapon" }, { id: "armor", label: "Armor" }, { id: "charm", label: "Charm" }];
export default function MarketPanel({ onBalanceChanged, onSessionExpired }: { onBalanceChanged: (balance: PlayerBalance) => void; onSessionExpired: () => void }) {
  const [market, setMarket] = useState<MarketState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void getMarket(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setMarket(result); onBalanceChanged(result.balance);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : "Unable to load the market.");
    });
    return () => controller.abort();
  }, [attempt, onBalanceChanged, onSessionExpired]);
  async function act(action: "buy" | "equip" | "remove", item: MarketItem) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(item.id); setError(""); setNotice("");
    try {
      const result = action === "buy" ? await buyItem(item.id) : await equipItem(item.slot, action === "remove" ? null : item.id);
      setMarket(result); onBalanceChanged(result.balance);
      setNotice(action === "buy" ? `${item.name} added to your collection.` : action === "equip" ? `${item.name} equipped.` : `${item.name} removed.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : "Unable to update your equipment.");
      // A lost response or another tab may have changed the balance or ownership.
      try { const current = await getMarket(); setMarket(current); onBalanceChanged(current.balance); }
      catch (refreshError) { if (refreshError instanceof ApiError && refreshError.status === 401) onSessionExpired(); }
    } finally { inFlight.current = false; setBusy(null); }
  }
  if (!market) return <section className="market-panel"><h2>Market</h2>{error ? <><p className="task-error" role="alert">{error}</p><button className="button button-secondary" type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Try again</button></> : <p className="muted" role="status">Loading your collection…</p>}</section>;
  return <>
    <section className="equipment-summary" aria-labelledby="equipped-title"><h2 id="equipped-title">Your equipment</h2><dl className="equipment-slots">
      {slots.map(slot => { const item = market.items.find(item => item.id === market.equipped[slot.id]); return <div key={slot.id}><dt>{slot.label}</dt><dd>{item?.name ?? "Nothing equipped"}</dd>{item && <button className="auth-text-button" type="button" disabled={busy !== null} onClick={() => void act("remove", item)}>Remove {slot.label.toLowerCase()}</button>}</div>; })}
    </dl></section>
    <section className="market-panel" aria-labelledby="market-title"><div className="section-heading"><h2 id="market-title">Market</h2><span className="market-balance">{market.balance.gold.toLocaleString()} gold</span></div>
      <p className="muted market-description">Give your character a story of their own. Equipment is cosmetic; your progress comes from your quests.</p>
      <p className="task-notice" role="status">{notice}</p>{error && <p className="task-error" role="alert">{error}</p>}
      <ul className="market-list">{market.items.map(item => {
        const owned = market.ownedIds.includes(item.id), equipped = market.equipped[item.slot] === item.id, affordable = market.balance.gold >= item.price;
        return <li key={item.id} className={equipped ? "market-item market-item-equipped" : "market-item"}>
          <div><p className="market-slot">{item.slot}{equipped ? " · Equipped" : owned ? " · Owned" : ""}</p><h3>{item.name}</h3><p className="muted">{item.description}</p></div>
          <div className="market-item-action"><span>{owned ? "In your collection" : `${item.price} gold`}</span>
            <button className={`button ${owned ? "button-secondary" : "button-primary"}`} type="button" disabled={busy !== null || equipped || (!owned && !affordable)}
              aria-label={equipped ? `${item.name} equipped` : owned ? `Equip ${item.name}` : `Buy ${item.name} for ${item.price} gold`}
              onClick={() => void act(owned ? "equip" : "buy", item)}>{busy === item.id ? "Saving…" : equipped ? "Equipped" : owned ? "Equip" : affordable ? "Buy" : "Not enough gold"}</button>
          </div>
        </li>;
      })}</ul>
    </section>
  </>;
}
