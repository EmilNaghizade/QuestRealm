import { t, locale } from "../../lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerBalance } from "../auth/auth-api";
import { ApiError } from "../../lib/api";
import { conquerKingdom, getKingdoms, recruitTroops, startSiege, type KingdomState } from "./kingdoms-api";
export default function KingdomsPage({ onBalanceChanged, onSessionExpired }: { onBalanceChanged: (balance: PlayerBalance) => void; onSessionExpired: () => void }) {
  const [realm, setRealm] = useState<KingdomState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [now, setNow] = useState(0);
  const clock = useRef({ server: 0, local: 0 });
  const inFlight = useRef(false);
  const siegeEnd = realm?.siege?.endsAt;
  useEffect(() => {
    if (!siegeEnd) return;
    const timer = window.setInterval(() => setNow(clock.current.server + performance.now() - clock.current.local), 500);
    return () => window.clearInterval(timer);
  }, [siegeEnd]);
  useEffect(() => {
    const controller = new AbortController();
    void getKingdoms(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      clock.current = { server: Date.parse(result.serverNow), local: performance.now() };
      setNow(clock.current.server); setRealm(result); onBalanceChanged(result.balance);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : t("Unable to load your realm."));
    });
    return () => controller.abort();
  }, [attempt, onBalanceChanged, onSessionExpired]);
  const accept = useCallback((result: KingdomState) => {
    clock.current = { server: Date.parse(result.serverNow), local: performance.now() };
    setNow(clock.current.server); setRealm(result); onBalanceChanged(result.balance);
  }, [onBalanceChanged]);
  async function act(action: "recruit" | "start" | "claim", id: string) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(id); setError(""); setNotice("");
    try {
      if (action === "recruit") {
        const result = await recruitTroops(id, quantity); accept(result);
        setNotice(t(`${quantity} ${result.army.troops.find(troop => troop.id === id)?.name.toLowerCase()} joined your army.`));
      } else if (action === "start") {
        const result = await startSiege(id); accept(result);
        setNotice(t(`The siege of ${result.regions.find(region => region.id === id)?.name} has begun. Your army stays with you after victory.`));
      } else {
        const result = await conquerKingdom(id); accept(result);
        setNotice(t(`${result.regions.find(region => region.id === id)?.name} joins your realm. +${result.reward.gold} gold.`));
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : t("Unable to update your realm."));
      try { accept(await getKingdoms()); }
      catch (refreshError) { if (refreshError instanceof ApiError && refreshError.status === 401) onSessionExpired(); }
    } finally { inFlight.current = false; setBusy(null); }
  }
  if (!realm) return <section>{error ? <><p className="task-error" role="alert">{t(error)}</p><button className="button button-secondary" type="button" onClick={() => { setError(""); setAttempt(value => value + 1); }}>{t("Try again")}</button></> : <p role="status">{t("Opening your realm's chronicle…")}</p>}</section>;
  const conquered = realm.regions.filter(region => region.status === "conquered");
  const remaining = realm.siege ? Math.max(0,Math.ceil((Date.parse(realm.siege.endsAt) - now) / 1000)) : 0;
  const activeRegion = realm.regions.find(region => region.id === realm.siege?.kingdomId);
  return <div className="kingdoms-page">
    <section className="realm-summary" aria-label={t("Realm progress")}><div><span className="eyebrow">{t("Your realm")}</span><h2>{t("{0} of {1} kingdoms",{0:conquered.length,1:realm.regions.length})}</h2></div><p className="muted">{t("Earn XP, gather your army and lead a siege. Your XP is never spent, and soldiers stay in your army after victory.")}</p><progress aria-label={t("Kingdoms conquered")} value={conquered.length} max={realm.regions.length}/></section>
    <p className="realm-notice" role="status" key={t(notice)}>{t(notice)}</p>{error && <p className="task-error" role="alert">{t(error)}</p>}
    <section className="army-camp" aria-labelledby="army-title"><div className="section-heading"><div><p className="eyebrow">{t("The gathering")}</p><h2 id="army-title">{t("Your army")}</h2></div><span className="army-power">{realm.army.power} {t("power")} · {realm.balance.gold.toLocaleString(locale())} {t("gold")}</span></div>
      <div className="recruitment-heading"><p className="muted">{t("Recruit with earned gold. Each soldier adds permanent army strength.")}</p><label htmlFor="recruit-count">{t("Recruits per order")} <select id="recruit-count" value={quantity} disabled={busy !== null} onChange={event => setQuantity(Number(event.target.value))}>{[1,2,3,5,10,20].map(count => <option key={count} value={count}>{count}</option>)}</select></label></div>
      <ul className="troop-list">{realm.army.troops.map(troop => {
        const cost = troop.price * quantity, levelMet = realm.balance.progression.level >= troop.level, affordable = realm.balance.gold >= cost, capped = troop.count + quantity > 10000;
        return <li key={troop.id}><div><h3>{t(troop.name)} <span className="troop-count">× {troop.count}</span></h3><p className="muted">{t(troop.description)}</p><p className="troop-meta">+{troop.power} {t("power each")} · {troop.price} {t("gold each")} · {t("Level")} {troop.level}</p></div><button className="button button-secondary" type="button" disabled={busy !== null || !levelMet || !affordable || capped} onClick={() => void act("recruit",troop.id)} aria-label={t(`Recruit ${quantity} ${t(troop.name)} for ${cost} gold`)}>{busy === troop.id ? t("Recruiting…") : !levelMet ? t(`Level ${troop.level} required`) : capped ? t("Recruitment limit") : !affordable ? t("Not enough gold") : t(`Recruit ${quantity} · ${cost} gold`)}</button></li>;
      })}</ul>
    </section>
    {activeRegion && realm.siege && <section className="siege-panel" aria-labelledby="siege-title"><div><p className="eyebrow">{remaining > 0 ? t("Your army is advancing") : t("Victory awaits")}</p><h2 id="siege-title">{t("Siege of {0}",{0:activeRegion.name})}</h2><p className="muted">{remaining > 0 ? t("Your siege continues even when you leave this page.") : t("Raise your banner to claim this kingdom and its reward.")}</p></div><div className="siege-timer" role="timer" aria-live="off" aria-label={t("Siege time remaining")}>{String(Math.floor(remaining/60)).padStart(2,"0")}:{String(remaining%60).padStart(2,"0")}</div><button className="button button-primary" type="button" disabled={busy !== null || remaining > 0} onClick={() => void act("claim",activeRegion.id)}>{busy === activeRegion.id ? t("Raising banner…") : t("Raise banner")}</button><progress aria-label={t("Siege progress")} value={Math.max(0,activeRegion.siegeSeconds-remaining)} max={activeRegion.siegeSeconds}/></section>}
    <ol className="kingdom-list">{realm.regions.map((region, index) => <li key={region.id} className={`kingdom-region kingdom-${region.status}`}>
      <div className="kingdom-number" aria-hidden="true">{region.status === "conquered" ? "⚑" : String(index + 1).padStart(2,"0")}</div>
      <div className="kingdom-copy"><p className="market-slot">{region.status === "conquered" ? t("Part of your realm") : region.status === "ready" ? t("Ready for your army") : t("Beyond the frontier")} · {t("Level")} {region.level}</p><h2>{region.name}</h2><p className="muted">{t(region.status === "conquered" ? region.chronicle : region.description)}</p>
        {region.status !== "conquered" && <><progress aria-label={t(`${region.name} XP progress`)} value={region.progress} max={100}/><p className="kingdom-requirement">{region.xpRemaining > 0 ? t(`${region.xpRemaining.toLocaleString(locale())} XP remaining`) : t("Level requirement met")}{!region.prerequisiteMet && t(` · Conquer ${region.previousName} first`)}</p><p className="kingdom-requirement">{t("Army")} {realm.army.power} / {region.defense} {t("power")} · {region.siegeSeconds}s {t("siege")}</p></>}
      </div>
      <div className="kingdom-action"><span>{region.status === "conquered" ? t("Reward claimed") : t(`+${region.gold} gold`)}</span><button className={`button ${region.status === "ready" ? "button-primary" : "button-secondary"}`} type="button" disabled={busy !== null || region.status !== "ready" || realm.siege !== null} onClick={() => void act("start",region.id)} aria-label={t(`Start siege: ${region.name}`)}>{busy === region.id ? t("Preparing…") : region.status === "conquered" ? t("Conquered") : realm.siege?.kingdomId === region.id ? t("Siege in progress") : realm.siege ? t("Another siege active") : region.status === "ready" ? t("Start siege") : t("Locked")}</button></div>
    </li>)}</ol>
  </div>;
}
