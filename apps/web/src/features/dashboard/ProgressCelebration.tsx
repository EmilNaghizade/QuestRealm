import { t } from "../../lib/i18n";
import { useEffect, useState, type CSSProperties } from "react";

export type RewardMoment = {
  sequence: number;
  title: string;
  xp: number;
  gold: number;
};

export default function ProgressCelebration({ reward, level }: { reward?: RewardMoment; level?: number }) {
  const [visible, setVisible] = useState(true);
  const isLevelUp = level !== undefined;
  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), isLevelUp ? 5000 : 3200);
    return () => window.clearTimeout(timeout);
  }, [isLevelUp]);
  if (!visible) return null;
  return <section className={`progress-celebration ${isLevelUp ? "level-celebration" : "reward-celebration"}`} aria-label={isLevelUp ? t("Level up") : t("Quest completed")}>
    {isLevelUp && <div className="celebration-particles" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ "--particle": index, "--spread": `${(index - 8.5) * 19}px`, "--fall": `${70 + (index % 4) * 25}px`, "--spin": `${index % 2 ? 160 : -160}deg` } as CSSProperties}/>)}
    </div>}
    <button className="celebration-close" type="button" aria-label={isLevelUp ? t("Dismiss level up") : t("Dismiss quest reward")} onClick={() => setVisible(false)}>×</button>
    <div className="celebration-emblem" aria-hidden="true">{isLevelUp ? "✦" : "✓"}</div>
    <div role="status" aria-live="polite" aria-atomic="true">
      <p className="celebration-label">{isLevelUp ? t("A new milestone") : t("Quest completed")}</p>
      <h2>{isLevelUp ? t(`Level ${level}`) : reward?.title}</h2>
      <p className="celebration-detail">{isLevelUp ? t("A little progress. A stronger you.") : <><span>+{reward?.xp} {t("XP")}</span><span>+{reward?.gold} {t("gold")}</span></>}</p>
    </div>
  </section>;
}
