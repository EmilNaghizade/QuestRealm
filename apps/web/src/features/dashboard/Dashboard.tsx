import { useEffect, useRef, useState } from "react";
import type { AuthUser, PlayerBalance } from "../auth/auth-api";
import TasksPanel from "../tasks/TasksPanel";
import FocusPage from "../focus/FocusPage";
import { useFocus } from "../focus/focus-context";
import { getFocusStatistics, type FocusStatistics } from "../focus/focus-stats-api";
import ProgressCelebration, { type RewardMoment } from "./ProgressCelebration";
import "./dashboard.css";

type Theme = "light" | "dark";
type DashboardProps = {
  user: AuthUser;
  onSessionExpired: () => void;
  onBalanceChanged: (balance: PlayerBalance) => void;
};

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("questrealm.theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch { /* Use the system preference when storage is unavailable. */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function NavigationIcon({ kind }: { kind: "today" | "focus" | "character" | "kingdoms" }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "today" ? <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></> :
      kind === "focus" ? <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></> :
      kind === "character" ? <><circle cx="12" cy="7" r="4"/><path d="M3 22v-2a9 9 0 0 1 18 0v2"/></> :
      <><path d="M4 22V3m0 1c6-5 10 5 16 0v11c-6 5-10-5-16 0"/></>}
  </svg>;
}

function FocusPreview() {
  const { timer, remainingMs, error, isBusy, sendCommand, completionEvent } = useFocus();
  const [stats, setStats] = useState<FocusStatistics | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void getFocusStatistics(controller.signal).then(result => {
      if (!controller.signal.aborted) setStats(result);
    }).catch(() => {});
    return () => controller.abort();
  }, [completionEvent]);
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const running = timer?.status === "running";
  const paused = timer?.status === "paused";
  return <section className="card focus-card" aria-labelledby="focus-preview-title">
    <h2 id="focus-preview-title">Focus</h2>
    {timer ? <>
      <div className="timer-preview" role="timer" aria-label="Time remaining" aria-live="off">{time}</div>
      <p className="focus-caption">{timer.mode !== "focus" ? "Break · " : ""}{running ? "In progress" : paused ? "Paused" : "Ready when you are"}</p>
    </> : <p className="focus-caption" role="status">{error ? "Open Focus to reconnect." : "Preparing your timer…"}</p>}
    <button className="button button-primary" type="button"
      disabled={!timer || isBusy || (running && remainingMs === 0)}
      onClick={() => void sendCommand({ action: running ? "pause" : paused ? "resume" : "start" })}>
      <span aria-hidden="true">{running ? "Ⅱ" : "▶"}</span>
      {running ? "Pause" : paused ? "Resume" : "Start"} {timer?.mode === "focus" ? "focus" : "timer"}
    </button>
    {error && <p className="task-error" role="alert">{error}</p>}
    {stats && <p className="focus-today">Today&nbsp; {stats.today.minutes} min · {stats.today.sessions} sessions</p>}
    <a className="focus-details-link" href="#focus">Timer settings & history →</a>
  </section>;
}

export default function Dashboard({ user, onSessionExpired, onBalanceChanged }: DashboardProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [page, setPage] = useState(() => window.location.hash === "#focus" ? "focus" : "dashboard");
  const { progression } = user;
  const sequence = useRef(0);
  const [rewardMoment, setRewardMoment] = useState<RewardMoment | null>(null);
  const [levelMoment, setLevelMoment] = useState<{ level: number; sequence: number } | null>(null);
  const format = (value: number) => new Intl.NumberFormat().format(value);
  const toggleTheme = () => setTheme(current => current === "light" ? "dark" : "light");
  useEffect(() => {
    const handleHashChange = () => setPage(window.location.hash === "#focus" ? "focus" : "dashboard");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("questrealm.theme", theme); } catch { /* Theme works without storage. */ }
  }, [theme]);
  return <div className="app-shell">
    <aside className="sidebar" aria-label="Application sidebar">
      <a className="brand" href="#dashboard"><strong>QuestRealm</strong></a>
      <nav className="navigation" aria-label="Main navigation">
        <a className={`navigation-item ${page === "dashboard" ? "navigation-item-active" : ""}`} href="#dashboard" aria-current={page === "dashboard" ? "page" : undefined}><NavigationIcon kind="today"/>Today</a>
        <a className={`navigation-item ${page === "focus" ? "navigation-item-active" : ""}`} href="#focus" aria-current={page === "focus" ? "page" : undefined}><NavigationIcon kind="focus"/>Focus</a>
        <span className="navigation-item navigation-item-unavailable" aria-disabled="true"><NavigationIcon kind="character"/>Character<small>Soon</small></span>
        <span className="navigation-item navigation-item-unavailable" aria-disabled="true"><NavigationIcon kind="kingdoms"/>Kingdoms<small>Soon</small></span>
      </nav>
      <button className="sidebar-settings" type="button" onClick={toggleTheme}><span aria-hidden="true">⚙</span>{theme === "light" ? "Dark theme" : "Light theme"}</button>
    </aside>
    <main className="main-content page-enter" id={page} key={page}>
      <header className="page-header">
        <div><h1>{page === "focus" ? "Focus" : "Today"}</h1><p className="muted">{page === "focus" ? "One thing at a time." : "A little progress, every day."}</p></div>
        <button className="button button-secondary theme-button" type="button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}><span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>{theme === "light" ? "Dark theme" : "Light theme"}</button>
      </header>
      {page === "focus" ? <FocusPage/> : <>
        <section className="player-strip" aria-label="Player progress">
          <span key={progression.level} className={`badge ${levelMoment?.level === progression.level ? "level-badge-new" : ""}`}>Level {progression.level}</span>
          <div className="player-xp"><progress aria-label="Progress to next level" value={progression.xpIntoLevel} max={progression.xpForNextLevel}/><span>{format(progression.xpIntoLevel)} / {format(progression.xpForNextLevel)} XP</span></div>
          <span className="player-gold"><span className="gold-dot" aria-hidden="true"/> {format(user.gold)} gold</span>
        </section>
        <div className="dashboard-grid minimal-dashboard">
          <TasksPanel onSessionExpired={onSessionExpired} onBalanceChanged={onBalanceChanged}
            onTaskCompleted={(title, result) => {
              const currentSequence = ++sequence.current;
              setRewardMoment({ sequence: currentSequence, title, ...result.reward });
              if (result.balance.progression.level > user.progression.level) {
                setLevelMoment({ level: result.balance.progression.level, sequence: currentSequence });
              }
            }}/>
          <div className="dashboard-side"><FocusPreview/><section className="conquest-preview" aria-labelledby="conquest-title"><h2 id="conquest-title">Next conquest</h2><p className="conquest-name">⚑ Kingdoms</p><p className="muted">New lands are coming soon.</p></section></div>
        </div>
      </>}
    </main>
    {rewardMoment && <ProgressCelebration key={`reward-${rewardMoment.sequence}`} reward={rewardMoment}/>}
    {levelMoment && <ProgressCelebration key={`level-${levelMoment.sequence}`} level={levelMoment.level}/>}
  </div>;
}
