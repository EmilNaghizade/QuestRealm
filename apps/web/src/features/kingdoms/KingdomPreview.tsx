import { t } from "../../lib/i18n";
import { useEffect, useState } from "react";
import { getKingdoms, type KingdomState } from "./kingdoms-api";
export default function KingdomPreview({ xp }: { xp: number }) {
  const [realm, setRealm] = useState<KingdomState | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void getKingdoms(controller.signal).then(result => { if (!controller.signal.aborted) { setRealm(result); setFailed(false); } }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [xp]);
  const next = realm?.regions.find(region => region.status !== "conquered");
  return <section className="conquest-preview" aria-labelledby="conquest-title"><h2 id="conquest-title">{t("Next conquest")}</h2>
    {failed ? <p className="muted">{t("Open your realm to reconnect.")}</p> : !realm ? <p className="muted" role="status">{t("Scouting the frontier…")}</p> : next ? <><p className="conquest-name">⚑ {next.name}</p><p className="muted">{realm.siege?.kingdomId === next.id ? t("Siege in progress") : next.status === "ready" ? t("Ready for your army") : next.xpRemaining > 0 ? t(`Level ${next.level} required`) : !next.prerequisiteMet ? t(`Conquer ${next.previousName} first`) : t(`Army ${realm.army.power} / ${next.defense} power`)}</p><progress aria-label={t(`${next.name} XP progress`)} value={next.progress} max={100}/></> : <p className="muted">{t("Every kingdom flies your banner.")}</p>}
    <a className="focus-details-link" href="#kingdoms">{t("Explore your realm →")}</a>
  </section>;
}
