import { useEffect, useState } from "react";
import type { AuthUser } from "../auth/auth-api";
import { getCharacters, type Character } from "../character/character-api";
import TasksPanel from "../tasks/TasksPanel";
import { ApiError } from "../../lib/api";

type Theme = "light" | "dark";

type DashboardProps = {
  user: AuthUser;
  onSessionExpired: () => void;
};

function getInitialTheme(): Theme {
  try {
    const savedTheme = localStorage.getItem("questrealm.theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    // Continue with the system preference.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function Dashboard({ user, onSessionExpired }: DashboardProps) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(true);
  const [characterError, setCharacterError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const numberFormatter = new Intl.NumberFormat();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem("questrealm.theme", theme);
    } catch {
      // Theme switching works even when storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCharacter() {
      try {
        const characters = await getCharacters(controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        const selectedCharacter = characters.find(
          (item) => item.id === user.characterId,
        );

        if (!selectedCharacter) {
          setCharacterError(
            "Your character could not be found. Please try again.",
          );
          return;
        }

        setCharacter(selectedCharacter);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

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
            className="navigation-item navigation-item-active"
            href="#dashboard"
            aria-current="page"
          >
            <span aria-hidden="true">▦</span>
            Dashboard
          </a>

          <span className="navigation-item navigation-item-unavailable">
            <span aria-hidden="true">◷</span>
            Focus Center
            <small>Soon</small>
          </span>

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

      <main className="main-content" id="dashboard">
        <header className="page-header">
          <div>
            <p className="eyebrow">Your daily adventure</p>
            <h1>Make today count.</h1>
            <p className="muted">
              Welcome back, {user.displayName}. Your next chapter awaits.
            </p>
          </div>

          <button
            className="button button-secondary theme-button"
            type="button"
            onClick={() => {
              setTheme((current) => (current === "light" ? "dark" : "light"));
            }}
            aria-label={`Switch to ${
              theme === "light" ? "dark" : "light"
            } theme`}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Dark theme" : "Light theme"}
          </button>
        </header>

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
              <span className="badge badge-muted">Your character</span>
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

          <section className="card focus-card" aria-labelledby="focus-title">
            <div className="section-heading">
              <h2 id="focus-title">A moment to focus</h2>
              <span className="focus-symbol" aria-hidden="true">
                ◷
              </span>
            </div>

            <p className="muted">
              Give one thing your full attention. The rest can wait.
            </p>

            <div className="timer-preview" aria-label="25 minutes">
              25<span>:</span>00
            </div>

            <p className="focus-caption">
              Your Focus Center is coming in the next steps.
            </p>
          </section>

          <TasksPanel onSessionExpired={onSessionExpired} />
        </div>

        <footer className="page-footer">
          Progress over perfection. Your adventure is yours to build.
        </footer>
      </main>
    </div>
  );
}
