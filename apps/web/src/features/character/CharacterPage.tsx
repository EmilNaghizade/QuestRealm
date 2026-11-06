import { useEffect, useState } from "react";
import type { AuthUser, PlayerBalance } from "../auth/auth-api";
import { ApiError } from "../../lib/api";
import { getCharacters, type Character } from "./character-api";
import MarketPanel from "./MarketPanel";

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
      if (!selected) { setError("Your character could not be found."); return; }
      setCharacter(selected);
    }).catch(error => {
      if (controller.signal.aborted) return;
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : "Unable to load your character.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user.characterId, onSessionExpired, attempt]);
  if (loading) return <p role="status">Loading your character…</p>;
  if (error) return <div><p className="task-error" role="alert">{error}</p><button className="button button-secondary" type="button" onClick={() => { setLoading(true); setError(""); setAttempt(current => current + 1); }}>Try again</button></div>;
  const format = (value: number) => new Intl.NumberFormat().format(value);
  return <div className="character-home">
    <section className="character-profile" aria-labelledby="character-profile-title">
      <div><p className="eyebrow">{character?.role}</p><h2 id="character-profile-title">{user.displayName}</h2><p className="muted">{character?.name} · {character?.description}</p>
        <dl className="character-totals"><div><dt>Level</dt><dd>{user.progression.level}</dd></div><div><dt>Total XP</dt><dd>{format(user.xp)}</dd></div><div><dt>Gold</dt><dd>{format(user.gold)}</dd></div></dl>
      </div>
      <div><h3>Your next level</h3><p className="muted">{format(user.progression.xpRemaining)} XP to level {user.progression.level + 1}</p><progress aria-label="Progress to next level" value={user.progression.xpIntoLevel} max={user.progression.xpForNextLevel}/><p className="muted">{format(user.progression.xpIntoLevel)} / {format(user.progression.xpForNextLevel)} XP</p></div>
    </section>
    <section className="character-story"><h2>Your story</h2><p className="muted">{character?.role}. Every quest you complete adds another chapter. Build your collection with the gold you earn and choose the equipment that tells your story.</p></section>
    <MarketPanel onBalanceChanged={onBalanceChanged} onSessionExpired={onSessionExpired}/>
  </div>;
}
