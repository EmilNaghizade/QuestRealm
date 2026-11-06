import LibraryPage from "../library/LibraryPage";
import AchievementsPage from "../achievements/AchievementsPage";
import AccountPage from "../account/AccountPage";
import { t, locale } from "../../lib/i18n";
import KingdomsPage from "../kingdoms/KingdomsPage";
import KingdomPreview from "../kingdoms/KingdomPreview";
import { getPageFromHash } from "../../lib/navigation";
import BrandLogo from "../../components/BrandLogo";
import { useEffect, useRef, useState } from "react";
import type { AuthUser, PlayerBalance } from "../auth/auth-api";
import TasksPanel from "../tasks/TasksPanel";
import CharacterPage from "../character/CharacterPage";
import FocusPage from "../focus/FocusPage";
import { useFocus } from "../focus/focus-context";
import {
  getFocusStatistics,
  type FocusStatistics,
} from "../focus/focus-stats-api";
import ProgressCelebration, { type RewardMoment } from "./ProgressCelebration";
import "./dashboard.css";

type Theme = "light" | "dark";
type DashboardProps = {
  user: AuthUser;
  onSessionExpired: () => void;
  onBalanceChanged: (balance: PlayerBalance) => void;
  onProfileChanged: (user: AuthUser) => void;
};

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("questrealm.theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Use the system preference when storage is unavailable. */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function NavigationIcon({
  kind,
}: {
  kind: "today" | "focus" | "character" | "kingdoms";
}) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "today" ? (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M7 3v4m10-4v4M3 10h18" />
        </>
      ) : kind === "focus" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="4" />
        </>
      ) : kind === "character" ? (
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M3 22v-2a9 9 0 0 1 18 0v2" />
        </>
      ) : (
        <>
          <path d="M4 22V3m0 1c6-5 10 5 16 0v11c-6 5-10-5-16 0" />
        </>
      )}
    </svg>
  );
}

function FocusPreview() {
  const { timer, remainingMs, error, isBusy, sendCommand, completionEvent } =
    useFocus();
  const [stats, setStats] = useState<FocusStatistics | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void getFocusStatistics(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setStats(result);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [completionEvent]);
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const time = t(
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
  );
  const running = timer?.status === "running";
  const paused = timer?.status === "paused";
  return (
    <section className="card focus-card" aria-labelledby="focus-preview-title">
      <h2 id="focus-preview-title">{t("Focus")}</h2>
      {timer ? (
        <>
          <div
            className="timer-preview"
            role="timer"
            aria-label={t("Time remaining")}
            aria-live="off"
          >
            {time}
          </div>
          <p className="focus-caption">
            {timer.mode !== "focus" ? t("Break · ") : ""}
            {running
              ? t("In progress")
              : paused
                ? t("Paused")
                : t("Ready when you are")}
          </p>
        </>
      ) : (
        <p className="focus-caption" role="status">
          {error ? t("Open Focus to reconnect.") : t("Preparing your timer…")}
        </p>
      )}
      <button
        className="button button-primary"
        type="button"
        disabled={!timer || isBusy || (running && remainingMs === 0)}
        onClick={() =>
          void sendCommand({
            action: running ? "pause" : paused ? "resume" : "start",
          })
        }
      >
        <span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>
        {running ? t("Pause") : paused ? t("Resume") : t("Start")}{" "}
        {timer?.mode === "focus" ? "focus" : "timer"}
      </button>
      {error && (
        <p className="task-error" role="alert">
          {t(error)}
        </p>
      )}
      {stats && (
        <p className="focus-today">
          {t("Today")} {stats.today.minutes} {t("min")} · {stats.today.sessions}{" "}
          {t("sessions")}{" "}
        </p>
      )}
      <a className="focus-details-link" href="#focus">
        {" "}
        {t("Timer settings & history →")}{" "}
      </a>
    </section>
  );
}

export default function Dashboard({
  user,
  onSessionExpired,
  onBalanceChanged,
  onProfileChanged,
}: DashboardProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [page, setPage] = useState(() => getPageFromHash(window.location.hash));
  const { progression } = user;
  const sequence = useRef(0);
  const [rewardMoment, setRewardMoment] = useState<RewardMoment | null>(null);
  const [levelMoment, setLevelMoment] = useState<{
    level: number;
    sequence: number;
  } | null>(null);
  const format = (value: number) =>
    new Intl.NumberFormat(locale()).format(value);
  const toggleTheme = () =>
    setTheme((current) => (current === "light" ? "dark" : "light"));
  useEffect(() => {
    const handleHashChange = () =>
      setPage(getPageFromHash(window.location.hash));
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("questrealm.theme", theme);
    } catch {
      /* Theme works without storage. */
    }
  }, [theme]);
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label={t("Application sidebar")}>
        <a className="brand" href="#dashboard">
          <BrandLogo />
        </a>
        <nav className="navigation" aria-label={t("Main navigation")}>
          <a
            className={`navigation-item ${page === "dashboard" ? "navigation-item-active" : ""}`}
            href="#dashboard"
            aria-current={page === "dashboard" ? "page" : undefined}
          >
            <NavigationIcon kind="today" /> {t("Today")}{" "}
          </a>
          <a
            className={`navigation-item ${page === "focus" ? "navigation-item-active" : ""}`}
            href="#focus"
            aria-current={page === "focus" ? "page" : undefined}
          >
            <NavigationIcon kind="focus" /> {t("Focus")}{" "}
          </a>
          <a
            className={`navigation-item ${page === "character" ? "navigation-item-active" : ""}`}
            href="#character"
            aria-current={page === "character" ? "page" : undefined}
          >
            <NavigationIcon kind="character" /> {t("Character")}{" "}
          </a>
          <a
            className={`navigation-item ${page === "kingdoms" ? "navigation-item-active" : ""}`}
            href="#kingdoms"
            aria-current={page === "kingdoms" ? "page" : undefined}
          >
            <NavigationIcon kind="kingdoms" />
            {t("Kingdoms")}
          </a>
          <a
            className={`navigation-item ${page === "profile" ? "navigation-item-active" : ""}`}
            href="#profile"
            aria-current={page === "profile" ? "page" : undefined}
          >
            <NavigationIcon kind="character" />
            {t("Profile")}
          </a>
          <a
            className={`navigation-item ${page === "achievements" ? "navigation-item-active" : ""}`}
            href="#achievements"
            aria-current={page === "achievements" ? "page" : undefined}
          >
            <span aria-hidden="true">✦</span>
            {t("Achievements")}
          </a>

          <a
            className={`navigation-item ${page === "library" ? "navigation-item-active" : ""}`}
            href="#library"
            aria-current={page === "library" ? "page" : undefined}
          >
            <span aria-hidden="true">▤</span>
            {t("Reading library")}
          </a>
<a
            className={`navigation-item ${page === "settings" ? "navigation-item-active" : ""}`}
            href="#settings"
            aria-current={page === "settings" ? "page" : undefined}
          >
            <span aria-hidden="true">⚙</span>
            {t("Settings")}
          </a>
        </nav>
      </aside>
      <main className="main-content page-enter" id={page} key={page}>
        <header className="page-header">
          <div>
            <h1>
              {page === "focus"
                ? t("Focus")
                : page === "character"
                  ? t("Character")
                  : page === "kingdoms"
                    ? t("Kingdoms")
                    : page === "profile"
                      ? t("Profile")
                      : page === "settings"
                        ? t("Settings")
                        : page === "achievements"
                          ? t("Achievements")
                          : page === "library"
                            ? t("Reading library")
                            : t("Today")}
            </h1>
            <p className="muted">
              {page === "focus"
                ? t("One thing at a time.")
                : page === "character"
                  ? t("Your progress, your adventure.")
                  : page === "kingdoms"
                    ? t("Build a realm, one quest at a time.")
                    : page === "profile" || page === "settings"
                      ? t("Your account, your preferences.")
                      : page === "achievements"
                        ? t("Every small step leaves a mark.")
                        : page === "library"
                          ? t("A page at a time")
                          : t("A little progress, every day.")}
            </p>
          </div>
          <button
            className="button button-secondary theme-button"
            type="button"
            onClick={toggleTheme}
            aria-label={t(
              `Switch to ${theme === "light" ? "dark" : "light"} theme`,
            )}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? t("Dark theme") : t("Light theme")}
          </button>
        </header>
        {page === "library" ? (
          <LibraryPage onSessionExpired={onSessionExpired} />
        ) : page === "achievements" ? (
          <AchievementsPage onSessionExpired={onSessionExpired} />
        ) : page === "profile" || page === "settings" ? (
          <AccountPage
            key={page}
            section={page}
            user={user}
            theme={theme}
            onThemeChanged={setTheme}
            onProfileChanged={onProfileChanged}
            onSessionExpired={onSessionExpired}
          />
        ) : page === "focus" ? (
          <FocusPage onSessionExpired={onSessionExpired} />
        ) : page === "character" ? (
          <CharacterPage
            user={user}
            onSessionExpired={onSessionExpired}
            onBalanceChanged={onBalanceChanged}
          />
        ) : page === "kingdoms" ? (
          <KingdomsPage
            onSessionExpired={onSessionExpired}
            onBalanceChanged={onBalanceChanged}
          />
        ) : (
          <>
            <section className="player-strip" aria-label={t("Player progress")}>
              <span
                key={progression.level}
                className={`badge ${levelMoment?.level === progression.level ? "level-badge-new" : ""}`}
              >
                {" "}
                {t("Level")} {progression.level}
              </span>
              <div className="player-xp">
                <progress
                  aria-label={t("Progress to next level")}
                  value={progression.xpIntoLevel}
                  max={progression.xpForNextLevel}
                />
                <span>
                  {format(progression.xpIntoLevel)} /{" "}
                  {format(progression.xpForNextLevel)} {t("XP")}{" "}
                </span>
              </div>
              <span className="player-gold">
                <span className="gold-dot" aria-hidden="true" />{" "}
                {format(user.gold)} {t("gold")}{" "}
              </span>
            </section>
            <div className="dashboard-grid minimal-dashboard">
              <TasksPanel
                onSessionExpired={onSessionExpired}
                onBalanceChanged={onBalanceChanged}
                onTaskCompleted={(title, result) => {
                  const currentSequence = ++sequence.current;
                  setRewardMoment({
                    sequence: currentSequence,
                    title,
                    ...result.reward,
                  });
                  if (
                    result.balance.progression.level > user.progression.level
                  ) {
                    setLevelMoment({
                      level: result.balance.progression.level,
                      sequence: currentSequence,
                    });
                  }
                }}
              />
              <div className="dashboard-side">
                <FocusPreview />
                <KingdomPreview xp={user.xp} />
                <a className="achievement-shortcut" href="#achievements">
                  <span aria-hidden="true">✦</span>{" "}
                  {t("Achievements & daily streak")} →
                </a>
              </div>
            </div>
          </>
        )}
      </main>
      {rewardMoment && (
        <ProgressCelebration
          key={`reward-${rewardMoment.sequence}`}
          reward={rewardMoment}
        />
      )}
      {levelMoment && (
        <ProgressCelebration
          key={`level-${levelMoment.sequence}`}
          level={levelMoment.level}
        />
      )}
    </div>
  );
}
