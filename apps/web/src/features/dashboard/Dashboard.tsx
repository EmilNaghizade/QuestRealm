import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const sampleTasks = [
  {
    id: "reading",
    title: "Read 15 pages",
    category: "Daily quest",
    difficulty: "Easy",
    xp: 20,
    gold: 10,
  },
  {
    id: "project",
    title: "Build something meaningful",
    category: "One-time quest",
    difficulty: "Hard",
    xp: 60,
    gold: 30,
  },
  {
    id: "english",
    title: "Practice English for 10 minutes",
    category: "Daily quest",
    difficulty: "Medium",
    xp: 40,
    gold: 20,
  },
] as const;

function getInitialTheme(): Theme {
  try {
    const savedTheme = localStorage.getItem("questrealm.theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    // Continue with the system preference when storage is unavailable.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem("questrealm.theme", theme);
    } catch {
      // Theme switching still works without persistent storage.
    }
  }, [theme]);

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
              A little focus. A few quests. A stronger you.
            </p>
          </div>

          <button
            className="button button-secondary theme-button"
            type="button"
            onClick={() => {
              setTheme((current) => (current === "light" ? "dark" : "light"));
            }}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          >
            <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
            {theme === "light" ? "Dark theme" : "Light theme"}
          </button>
        </header>

        <div className="preview-notice" role="note">
          Design preview — character, quests and rewards are sample data.
        </div>

        <section className="hero-card" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="badge">A new journey</span>
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
              <span className="badge badge-muted">Preview</span>
            </div>

            <div className="character-summary">
              <div className="avatar" aria-hidden="true">
                ♞
              </div>

              <div>
                <h3>The Adventurer</h3>
                <p className="muted">Level 1 · A fresh beginning</p>
              </div>
            </div>

            <div className="progress-heading">
              <label htmlFor="hero-xp">Experience</label>
              <span>40 / 100 XP</span>
            </div>

            <progress id="hero-xp" max={100} value={40}>
              40%
            </progress>

            <div className="character-stats">
              <div>
                <span className="stat-value">120</span>
                <span className="muted">Gold</span>
              </div>

              <div>
                <span className="stat-value">3</span>
                <span className="muted">Quests ahead</span>
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

          <section
            className="card quests-card"
            id="quests"
            aria-labelledby="quests-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">One step at a time</p>
                <h2 id="quests-title">Your quests</h2>
              </div>

              <span className="quest-count">{sampleTasks.length} quests</span>
            </div>

            <ul className="quest-list">
              {sampleTasks.map((task) => (
                <li className="quest-item" key={task.id}>
                  <span className="quest-marker" aria-hidden="true">
                    ◇
                  </span>

                  <div className="quest-description">
                    <h3>{task.title}</h3>
                    <p className="muted">
                      {task.category} · {task.difficulty}
                    </p>
                  </div>

                  <div className="quest-rewards" aria-label="Sample rewards">
                    <span className="reward-xp">+{task.xp} XP</span>
                    <span className="reward-gold">+{task.gold} gold</span>
                  </div>
                </li>
              ))}
            </ul>

            <p className="section-footnote">
              Quest creation and completion will be connected to your account in
              the tasks step.
            </p>
          </section>
        </div>

        <footer className="page-footer">
          Progress over perfection. Your adventure is yours to build.
        </footer>
      </main>
    </div>
  );
}

export default App;
