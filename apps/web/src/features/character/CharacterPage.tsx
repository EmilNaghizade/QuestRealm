import { t, locale } from "../../lib/i18n";
import { useEffect, useState } from "react";
import type { AuthUser, PlayerBalance } from "../auth/auth-api";
import { ApiError } from "../../lib/api";
import { getCharacters, type Character } from "./character-api";
import MarketPanel from "./MarketPanel";
import { characterLore } from "./character-lore";

export default function CharacterPage({ user, onSessionExpired, onBalanceChanged }: { user: AuthUser; onSessionExpired: () => void; onBalanceChanged: (balance: PlayerBalance) => void }) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void getCharacters(controller.signal).then(characters => {
      if (controller.signal.aborted) return;
      const selected = characters.find(item => item.id === user.characterId);
      if (!selected) { setError(t("Your character could not be found.")); return; }
      setCharacter(selected);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : t("Unable to load your character."));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user.characterId, onSessionExpired, attempt]);
  if (loading) return <p role="status">{t("Loading your character…")}</p>;
  if (error) return <div><p className="task-error" role="alert">{t(error)}</p><button className="button button-secondary" type="button" onClick={() => { setLoading(true); setError(""); setAttempt(current => current + 1); }}>{t("Try again")}</button></div>;
  const lore = characterLore[user.characterId ?? ""];
  const format = (value: number) => new Intl.NumberFormat(locale()).format(value);
  return <div className="character-home">
    <section className="character-profile" aria-labelledby="character-profile-title">
      <div><p className="eyebrow">{t(character?.role)}</p><h2 id="character-profile-title">{user.displayName}</h2><p className="muted">{t(character?.name)} · {t(character?.description)}</p>
        <dl className="character-totals"><div><dt>{t("Level")}</dt><dd>{user.progression.level}</dd></div><div><dt>{t("Total XP")}</dt><dd>{format(user.xp)}</dd></div><div><dt>{t("Gold")}</dt><dd>{format(user.gold)}</dd></div></dl>
      </div>
      <div><h3>{t("Your next level")}</h3><p className="muted">{t("Your next level: {0} XP to level {1}",{0:format(user.progression.xpRemaining),1:user.progression.level+1})}</p><progress aria-label={t("Progress to next level")} value={user.progression.xpIntoLevel} max={user.progression.xpForNextLevel}/><p className="muted">{format(user.progression.xpIntoLevel)} / {format(user.progression.xpForNextLevel)} {t("XP")}</p></div>
    </section>
    <section className="character-story"><h2>{t("Your story")}</h2><blockquote className="character-motto">{t(lore?.motto ?? character?.role)}</blockquote><p className="muted">{t(lore?.story ?? character?.description)}</p><p className="character-practice"><strong>{t("Your practice")}</strong> {t(lore?.practice ?? "Take one meaningful step today.")}</p></section>
    <MarketPanel onBalanceChanged={onBalanceChanged} onSessionExpired={onSessionExpired}/>
  </div>;
}
