import { t, locale } from "../../lib/i18n";
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
  const [view, setView] = useState<"market" | "collection">("market");
  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | "all">("all");
  const [pendingPurchase, setPendingPurchase] = useState<MarketItem | null>(null);
  const purchaseRef = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const dialog = purchaseRef.current;
    if (pendingPurchase && dialog && !dialog.open) dialog.showModal();
    else if (!pendingPurchase && dialog?.open) dialog.close();
  }, [pendingPurchase]);
  useEffect(() => {
    const controller = new AbortController();
    void getMarket(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setMarket(result); onBalanceChanged(result.balance);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : t("Unable to load the market."));
    });
    return () => controller.abort();
  }, [attempt, onBalanceChanged, onSessionExpired]);
  async function act(action: "buy" | "equip" | "remove", item: MarketItem) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(item.id); setError(""); setNotice("");
    try {
      const result = action === "buy" ? await buyItem(item.id) : await equipItem(item.slot, action === "remove" ? null : item.id);
      setMarket(result); onBalanceChanged(result.balance);
      setPendingPurchase(null);
      setNotice(action === "buy" ? `${t(item.name)} added to your collection.` : action === "equip" ? `${t(item.name)} equipped.` : `${t(item.name)} removed.`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : t("Unable to update your equipment."));
      // A lost response or another tab may have changed the balance or ownership.
      try { const current = await getMarket(); setMarket(current); onBalanceChanged(current.balance); }
      catch (refreshError) { if (refreshError instanceof ApiError && refreshError.status === 401) onSessionExpired(); }
    } finally { inFlight.current = false; setBusy(null); }
  }
  if (!market) return <section className="market-panel"><h2>{t("Market")}</h2>{error ? <><p className="task-error" role="alert">{t(error)}</p><button className="button button-secondary" type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>{t("Try again")}</button></> : <p className="muted" role="status">{t("Loading your collection…")}</p>}</section>;
  const visibleItems = market.items.filter(item => (slotFilter === "all" || item.slot === slotFilter) && (view === "market" || market.ownedIds.includes(item.id)));
  return <>
    <section className="equipment-summary" aria-labelledby="equipped-title"><h2 id="equipped-title">{t("Your equipment")}</h2><dl className="equipment-slots">
      {slots.map(slot => { const item = market.items.find(item => item.id === market.equipped[slot.id]); return <div key={slot.id}><dt>{t(slot.label)}</dt><dd>{item ? t(item.name) : t("Nothing equipped")}</dd>{item && <button className="auth-text-button" type="button" disabled={busy !== null} onClick={() => void act("remove", item)}>{t("Remove")} {t(slot.label)}</button>}</div>; })}
    </dl></section>
    <section className="market-panel" aria-labelledby="market-title"><div className="section-heading"><h2 id="market-title">{t("Merchant & collection")}</h2><span className="market-balance">{market.balance.gold.toLocaleString(locale())} {t("gold")}</span></div>
      <p className="muted market-description">{t("Give your character a story of their own. Equipment is cosmetic; your progress comes from your quests.")}</p>
      <p className="task-notice" role="status">{t(notice)}</p>{error && <p className="task-error" role="alert">{t(error)}</p>}
      <div className="task-tabs" role="group" aria-label={t("Market view")}>
        <button type="button" aria-pressed={view === "market"} onClick={() => setView("market")}>{t("Market")}</button>
        <button type="button" aria-pressed={view === "collection"} onClick={() => setView("collection")}>{t("Collection ({0})",{0:market.ownedIds.length})}</button>
      </div>
      <div className="market-filters" role="group" aria-label={t("Equipment type")}>{([{id:"all",label:t("All items")},...slots] as const).map(slot => <button className="button button-secondary" key={slot.id} type="button" aria-pressed={slotFilter === slot.id} onClick={() => setSlotFilter(slot.id)}>{t(slot.label)}</button>)}</div>
      {visibleItems.length === 0 && <div className="collection-empty"><h3>{t("Your story has room for more.")}</h3><p className="muted">{view === "collection" ? t("Buy equipment from the market to start this collection.") : t("No items in this category.")}</p>{view === "collection" && <button className="button button-secondary" type="button" onClick={() => setView("market")}>{t("Visit the market")}</button>}</div>}
      <ul className="market-list">{visibleItems.map(item => {
        const owned = market.ownedIds.includes(item.id), equipped = market.equipped[item.slot] === item.id, affordable = market.balance.gold >= item.price;
        return <li key={item.id} className={equipped ? "market-item market-item-equipped" : "market-item"}>
          <div><p className="market-slot">{t({weapon:"Weapon",armor:"Armor",charm:"Charm"}[item.slot])}{item.characterId ? t(" · Class signature") : t(" · Adventurer gear")}{equipped ? t(" · Equipped") : owned ? t(" · Owned") : ""}</p><h3>{t(item.name)}</h3><p className="muted">{t(item.description)}</p></div>
          <div className="market-item-action"><span>{owned ? t("In your collection") : t(`${item.price} gold`)}</span>
            <button className={`button ${owned ? "button-secondary" : "button-primary"}`} type="button" disabled={busy !== null || equipped || (!owned && !affordable)}
              aria-label={equipped ? `${t(item.name)} equipped` : owned ? t(`Equip ${t(item.name)}`) : t(`Buy ${t(item.name)} for ${item.price} gold`)}
              onClick={() => owned ? void act("equip", item) : setPendingPurchase(item)}>{busy === item.id ? t("Saving…") : equipped ? t("Equipped") : owned ? t("Equip") : affordable ? t("Buy") : t("Not enough gold")}</button>
          </div>
        </li>;
      })}</ul>
    </section>
    <dialog ref={purchaseRef} className="market-purchase-dialog" aria-labelledby="purchase-title" aria-describedby="purchase-description" onCancel={event => { if (busy) event.preventDefault(); else setPendingPurchase(null); }} onClose={() => setPendingPurchase(null)}>
      {pendingPurchase && <><p className="eyebrow">{t("The merchant's offer")}</p><h2 id="purchase-title">{t(pendingPurchase.name)}</h2><p id="purchase-description" className="muted">{t(pendingPurchase.description)}</p>
        <dl className="purchase-totals"><div><dt>{t("Price")}</dt><dd>{pendingPurchase.price} {t("gold")}</dd></div><div><dt>{t("Gold remaining")}</dt><dd>{Math.max(0,market.balance.gold-pendingPurchase.price)} {t("gold")}</dd></div></dl>
        <p className="muted">{t("Added to your collection. Equip it whenever you like.")}</p>
        <div className="quest-toolbar"><button className="button button-secondary" type="button" autoFocus disabled={busy !== null} onClick={() => setPendingPurchase(null)}>{t("Keep browsing")}</button><button className="button button-primary" type="button" disabled={busy !== null || market.balance.gold < pendingPurchase.price || market.ownedIds.includes(pendingPurchase.id)} onClick={() => void act("buy", pendingPurchase)}>{busy ? t("Buying…") : t(`Buy for ${pendingPurchase.price} gold`)}</button></div>
        {error && <p className="task-error" role="alert">{t(error)}</p>}
      </>}
    </dialog>
  </>;
}
