import { useEffect, useState } from "react";
import type { AuthUser, PlayerBalance } from "../auth/auth-api";
import { getCharacters, type Character } from "../character/character-api";
import TasksPanel from "../tasks/TasksPanel";
import FocusPage from "../focus/FocusPage";
import { useFocus } from "../focus/focus-context";
import { ApiError } from "../../lib/api";

type Theme = "light" | "dark";
type Page = "dashboard" | "focus";

type DashboardProps = {
  user: AuthUser;
  onSessionExpired: () => void;
  onBalanceChanged: (balance: PlayerBalance) => void;
};

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem("questrealm.theme");

    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Continue with the system preference.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getCurrentPage(): Page {
  return window.location.hash === "#focus" ? "focus" : "dashboard";
}

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function FocusPreview() {
  const { timer, remainingMs, error } = useFocus();

  const modeLabel =
    timer?.mode === "shortBreak"
      ? "Short break"
      : timer?.mode === "longBreak"
        ? "Long break"
        : "Focus";

  return (
    <section className="card focus-card" aria-labelledby="focus-preview-title">
      <div className="section-heading">
        <h2 id="focus-preview-title">A moment to focus</h2>
        <span className="focus-symbol" aria-hidden="true">
          ◷
        </span>
      </div>

      <p className="muted">
        Give one thing your full attention. The rest can wait.
      </p>

      {timer ? (
        <>
          <div
            className="timer-preview"
            role="timer"
            aria-label={`${modeLabel} time remaining`}
            aria-live="off"
          >
            {formatTime(remainingMs)}
          </div>

          <p className="focus-caption">
            {modeLabel}
            {" · "}
            {timer.status === "running"
              ? "In progress"
              : timer.status === "paused"
                ? "Paused"
                : "Ready when you are"}
          </p>
        </>
      ) : (
        <p className="focus-caption" role="status">
          {error ? "Open Focus Center to reconnect." : "Preparing your timer…"}
        </p>
      )}

      <a className="button button-secondary " href="#focus">
        Open Focus Center
      </a>
    </section>
  );
}

export default function Dashboard({
  user,
  onSessionExpired,
  onBalanceChanged,
}: DashboardProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [page, setPage] = useState<Page>(getCurrentPage);

  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(true);
  const [characterError, setCharacterError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const numberFormatter = new Intl.NumberFormat();
  const { progression } = user;

  useEffect(() => {
    function handleHashChange() {
      setPage(getCurrentPage());
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem("questrealm.theme", theme);
    } catch {
      // Theme switching works without persistent storage.
    }
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCharacter() {
      try {
        const characters = await getCharacters(controller.signal);

        if (controller.signal.aborted) return;

        const selected = characters.find(
          (item) => item.id === user.characterId,
        );

        if (!selected) {
          setCharacterError(
            "Your character could not be found. Please try again.",
          );
          return;
        }

        setCharacter(selected);
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired();
          return;
        }

        setCharacterError(
          error instanceof ApiError
            ? error.message
            : "Unable to load your character.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCharacter(false);
        }
      }
    }

    void loadCharacter();

    return () => controller.abort();
  }, [user.characterId, retryCount, onSessionExpired]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Application sidebar">
        <a className="brand" href="#dashboard" aria-label="QuestRealm home">
          <span className="brand-mark" aria-hidden="true">
            Q
          </span>
          <span>
            <strong>QuestRealm</strong>
            <small>Small steps. Great adventures.</small>
          </span>
        </a>

        <p className="navigation-label">Your adventure</p>

        <nav className="navigation" aria-label="Main navigation">
          <a
            className={`navigation-item ${
              page === "dashboard" ? "navigation-item-active" : ""
            }`}
            href="#dashboard"
            aria-current={page === "dashboard" ? "page" : undefined}
          >
            <span aria-hidden="true">▦</span>
            Dashboard
          </a>

          <a
            className={`navigation-item ${
              page === "focus" ? "navigation-item-active" : ""
            }`}
            href="#focus"
            aria-current={page === "focus" ? "page" : undefined}
          >
            <span aria-hidden="true">◷</span>
            Focus Center
          </a>

          <span className="navigation-item navigation-item-unavailable">
            <span aria-hidden="true">♜</span>
            Character
            <small>Soon</small>
          </span>

          <span className="navigation-item navigation-item-unavailable">
            <span aria-hidden="true">◇</span>
            World Map
            <small>Soon</small>
          </span>
        </nav>

        <div className="sidebar-note">
          <span className="eyebrow">A little reminder</span>
          <p>Your next chapter begins with one small quest.</p>
        </div>
      </aside>

      <main className="main-content" id={page}>
        <header className="page-header">
          <div>
            <p className="eyebrow">
              {page === "focus" ? "Your focus space" : "Your daily adventure"}
            </p>

            <h1>
              {page === "focus" ? "Find your rhythm." : "Make today count."}
            </h1>

            <p className="muted">
              {page === "focus"
                ? "One quiet session. One meaningful step."
                : `Welcome back, ${user.displayName}. Your next chapter awaits.`}
            </p>
          </div>

          <button
            className="button button-secondary theme-button"
            type="button"
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
            aria-label={`Switch to ${
              theme === "light" ? "dark" : "light"
            } theme`}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Dark theme" : "Light theme"}
          </button>
        </header>

        {page === "focus" ? (
          <FocusPage />
        ) : (
          <>
            <section className="hero-card" aria-labelledby="hero-title">
              <div className="hero-copy">
                <span className="badge">Your journey</span>
                <h2 id="hero-title">Every great kingdom starts small.</h2>
                <p>
                  Turn everyday progress into an adventure, one quest at a time.
                </p>
                <a className="button button-primary" href="#quests">
                  Explore your quests <span aria-hidden="true">→</span>
                </a>
              </div>

              <div className="hero-emblem" aria-hidden="true">
                <span>♜</span>
                <small>BUILD YOUR REALM</small>
              </div>
            </section>

            <div className="dashboard-grid">
              <section
                className="card character-card"
                aria-labelledby="character-title"
              >
                <div className="section-heading">
                  <h2 id="character-title">Your hero</h2>
                  <span className="badge badge-muted">
                    Level {progression.level}
                  </span>
                </div>

                {isLoadingCharacter ? (
                  <div className="character-summary" role="status">
                    <p className="muted">Loading your adventurer…</p>
                  </div>
                ) : characterError ? (
                  <div className="character-summary">
                    <div>
                      <p className="muted" role="alert">
                        {characterError}
                      </p>
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => {
                          setCharacterError("");
                          setIsLoadingCharacter(true);
                          setRetryCount((current) => current + 1);
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="character-summary">
                    <div className="avatar" aria-hidden="true">
                      {character?.symbol}
                    </div>
                    <div>
                      <h3>{user.displayName}</h3>
                      <p className="muted">{character?.name}</p>
                      <p className="muted">{character?.role}</p>
                    </div>
                  </div>
                )}

                <div className="progress-heading">
                  <span id="hero-xp-label">
                    Level {progression.level} progress
                  </span>
                  <span>
                    {numberFormatter.format(progression.xpIntoLevel)}
                    {" / "}
                    {numberFormatter.format(progression.xpForNextLevel)} XP
                  </span>
                </div>

                <progress
                  aria-labelledby="hero-xp-label"
                  value={progression.xpIntoLevel}
                  max={progression.xpForNextLevel}
                  aria-valuetext={`${
                    progression.xpRemaining
                  } XP to level ${progression.level + 1}`}
                />

                <p className="section-footnote">
                  {numberFormatter.format(progression.xpRemaining)} XP to level{" "}
                  {progression.level + 1}.
                </p>

                <div className="character-stats">
                  <div>
                    <span className="stat-value">
                      {numberFormatter.format(user.xp)}
                    </span>
                    <span className="muted">Total XP</span>
                  </div>
                  <div>
                    <span className="stat-value">
                      {numberFormatter.format(user.gold)}
                    </span>
                    <span className="muted">Gold</span>
                  </div>
                </div>
              </section>

              <FocusPreview />

              <TasksPanel
                onSessionExpired={onSessionExpired}
                onBalanceChanged={onBalanceChanged}
              />
            </div>
          </>
        )}

        <footer className="page-footer">
          Progress over perfection. Your adventure is yours to build.
        </footer>
      </main>
    </div>
  );
}
