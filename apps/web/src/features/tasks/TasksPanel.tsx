import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api";
import { getCurrentUser, type PlayerBalance } from "../auth/auth-api";
import {
  completeTask,
  createTask,
  updateTask,
  deleteTask,
  deleteAllTasks,
  getTasks,
  type Task,
  type TaskFilters,
  type TaskCompletion,
} from "./tasks-api";
import "./tasks.css";

type TasksPanelProps = {
  onSessionExpired: () => void;
  onBalanceChanged: (balance: PlayerBalance) => void;
  onTaskCompleted: (title: string, result: TaskCompletion) => void;
};

const difficultyLabels = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function TasksPanel({
  onSessionExpired,
  onBalanceChanged,
  onTaskCompleted,
}: TasksPanelProps) {
  const [celebratedIds, setCelebratedIds] = useState<string[]>([]);
  useEffect(() => {
    if (celebratedIds.length === 0) return;
    const timeout = window.setTimeout(() => setCelebratedIds([]), 1100);
    return () => window.clearTimeout(timeout);
  }, [celebratedIds]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Task["kind"]>("daily");
  const [difficulty, setDifficulty] = useState<Task["difficulty"]>("easy");

  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isBusy =
    isLoading || isCreating || isDeletingAll || deletingId !== null || completingId !== null;

  const hasFilters = Boolean(
    filters.kind || filters.difficulty || filters.status,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      try {
        const response = await getTasks(cursor, controller.signal, filters);

        if (controller.signal.aborted) return;

        setTasks((current) => {
          if (!cursor) return response.data.tasks;

          const merged = new Map(current.map((task) => [task.id, task]));

          for (const task of response.data.tasks) {
            merged.set(task.id, task);
          }

          return [...merged.values()];
        });

        setNextCursor(response.meta.nextCursor);
        setLoadError("");
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired();
          return;
        }

        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Unable to load quests. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadTasks();

    return () => controller.abort();
  }, [cursor, filters, reloadCount, onSessionExpired]);

  function refreshFromStart() {
    setIsLoading(true);
    setLoadError("");
    setTasks([]);
    setNextCursor(null);
    setCursor(undefined);
    setReloadCount((current) => current + 1);
  }

  function changeFilters(nextFilters: TaskFilters) {
    if (isBusy) return;

    setConfirmDeleteId(null);
    setActionError("");
    setNotice("");
    setFilters(nextFilters);
    refreshFromStart();
  }

  function markCompleted(id: string) {
    setTasks((current) => {
      if (filters.status === "active") {
        return current.filter((task) => task.id !== id);
      }

      return current.map((task) =>
        task.id === id ? { ...task, isCompleted: true, canChangeKind: false } : task,
      );
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) return;

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setActionError("Enter a quest title.");
      return;
    }

    setIsCreating(true);
    setActionError("");
    setNotice("");

    try {
      if (editingTask && tasks.find(task => task.id === editingTask.id)?.isCompleted) {
        setActionError("Completed quests cannot be edited.");
        return;
      }
      const input = { title: cleanTitle, kind, difficulty };
      if (editingTask) {
        await updateTask(editingTask.id, input);
      } else {
        await createTask(input);
      }

      setTitle("");
      setIsCreateOpen(false);
      setEditingTask(null);
      setNotice(
        editingTask ? "Quest updated." : hasFilters
          ? "Quest created. Your current filters still apply."
          : "Your new quest is ready.",
      );
      setConfirmDeleteId(null);
      refreshFromStart();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : editingTask ? "Unable to update your quest. Please try again." : "Unable to create your quest. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleComplete(task: Task) {
    if (isBusy || task.isCompleted) return;

    setCompletingId(task.id);
    setConfirmDeleteId(null);
    setActionError("");
    setNotice("");

    try {
      const result = await completeTask(task.id);

      markCompleted(task.id);
      if (editingTask?.id === task.id) { setEditingTask(null); setIsCreateOpen(false); setTitle(""); }
      setCelebratedIds(current => [...current, task.id]);
      onTaskCompleted(task.title, result);
      onBalanceChanged(result.balance);

    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      if (
        error instanceof ApiError &&
        error.code === "TASK_ALREADY_COMPLETED"
      ) {
        markCompleted(task.id);
        setNotice(
          "This quest was already completed. No extra reward was added.",
        );

        try {
          const user = await getCurrentUser();

          onBalanceChanged({
            xp: user.xp,
            gold: user.gold,
            progression: user.progression,
          });
        } catch (syncError) {
          if (syncError instanceof ApiError && syncError.status === 401) {
            onSessionExpired();
            return;
          }

          setActionError(
            "Your balance could not be refreshed. Reload to check it.",
          );
        }

        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setTasks((current) => current.filter((item) => item.id !== task.id));
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to complete your quest. Please try again.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  async function handleDeleteAll() {
    if (isBusy) return;
    setIsDeletingAll(true); setActionError(""); setNotice("");
    try {
      const count = await deleteAllTasks();
      setConfirmDeleteAll(false); setConfirmDeleteId(null);
      setEditingTask(null); setIsCreateOpen(false); setTitle("");
      setNotice(`${count} quests deleted. Your XP and gold are unchanged.`);
      refreshFromStart();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setActionError(error instanceof ApiError ? error.message : "Unable to delete quests. Please try again.");
    } finally { setIsDeletingAll(false); }
  }

  async function handleDelete(id: string) {
    if (isBusy) return;

    setDeletingId(id);
    setActionError("");
    setNotice("");

    try {
      await deleteTask(id);

      setTasks((current) => current.filter((task) => task.id !== id));
      setConfirmDeleteId(null);
      setNotice("Quest deleted.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setTasks((current) => current.filter((task) => task.id !== id));
        setConfirmDeleteId(null);
        setNotice("This quest is no longer available.");
        return;
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : "Unable to delete your quest. Please try again.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section
      className="card quests-card"
      id="quests"
      aria-labelledby="quests-title"
    >
      <div className="section-heading">
        <h2 id="quests-title">Your quests</h2>
        <div className="quest-toolbar">
        <button className="button task-delete-all" type="button" disabled={isBusy} aria-expanded={confirmDeleteAll} aria-controls="delete-all-confirmation" onClick={() => { setConfirmDeleteAll(current => !current); setConfirmDeleteId(null); }}>Delete all</button>
        <button className="button button-secondary" type="button" aria-expanded={isCreateOpen} aria-controls="new-quest-form"
          disabled={isBusy} onClick={() => {
            setEditingTask(null); setTitle(""); setKind("daily"); setDifficulty("easy");
            setActionError(""); setIsCreateOpen(true);
          }}>＋ New quest</button>
        </div>
      </div>
      {confirmDeleteAll && <section className="delete-all-confirmation" id="delete-all-confirmation" aria-labelledby="delete-all-title">
        <h3 id="delete-all-title">Delete all quests?</h3>
        <p>This removes every quest, including completed quests and quests outside the current filter. Your XP and gold stay unchanged.</p>
        <div className="quest-toolbar"><button className="button button-secondary" type="button" disabled={isBusy} onClick={() => setConfirmDeleteAll(false)}>Cancel</button>
        <button className="button task-delete-all-confirm" type="button" disabled={isBusy} onClick={() => void handleDeleteAll()}>{isDeletingAll ? "Deleting…" : "Delete all quests"}</button></div>
      </section>}
      <div className="task-tabs" role="group" aria-label="Quest type">
        {([{ value: undefined, label: "All" }, { value: "daily", label: "Daily" }, { value: "once", label: "One-time" }] as const).map(tab => (
          <button key={tab.label} type="button" aria-pressed={filters.kind === tab.value} disabled={isBusy}
            onClick={() => changeFilters({ kind: tab.value })}>{tab.label}</button>
        ))}
      </div>
      <div className="task-create-panel" id="new-quest-form" hidden={!isCreateOpen}>
        <div className="task-editor-heading"><h3>{editingTask ? "Edit quest" : "New quest"}</h3>
          <button className="auth-text-button" type="button" disabled={isBusy} onClick={() => { setIsCreateOpen(false); setEditingTask(null); setTitle(""); setActionError(""); }}>Cancel</button></div>
        <form onSubmit={handleCreate}>
          <fieldset className="task-form-fields" disabled={isBusy}>
            <legend className="auth-sr-only">New quest details</legend>

            <div className="task-field task-title-field">
              <label htmlFor="task-title">Quest title</label>
              <input
                id="task-title"
                name="title"
                placeholder="What would you like to accomplish?"
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="task-field">
              <label htmlFor="task-kind">Repeat</label>
              <select
                id="task-kind"
                value={kind}
                disabled={Boolean(editingTask && !editingTask.canChangeKind)}
                onChange={(event) =>
                  setKind(event.target.value as Task["kind"])
                }
              >
                <option value="daily">Daily</option>
                <option value="once">One-time</option>
              </select>
            </div>

            <div className="task-field">
              <label htmlFor="task-difficulty">Difficulty</label>
              <select
                id="task-difficulty"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as Task["difficulty"])
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            {editingTask && !editingTask.canChangeKind && <p className="muted task-kind-note">Repeat type is fixed after the first completion. Past rewards stay unchanged.</p>}
            <button
              className="button button-primary task-create-button"
              type="submit"
            >
              {isCreating ? "Saving…" : editingTask ? "Save changes" : "Add quest"}
            </button>
          </fieldset>
        </form>
      </div>

      {actionError && (
        <p className="task-error" role="alert">
          {actionError}
        </p>
      )}

      <p className="task-notice" role="status">
        {notice}
      </p>

      {tasks.length === 0 && !isLoading && !loadError && !nextCursor && (
        <div className="task-empty">
          <span className="quest-marker" aria-hidden="true">
            ◇
          </span>
          <h3>
            {hasFilters
              ? "No quests match these filters."
              : "Your next adventure starts here."}
          </h3>
          <p className="muted">
            {hasFilters
              ? "Try different filters or create a new quest."
              : "Create a small, meaningful quest for today."}
          </p>
        </div>
      )}

      <ul className="quest-list task-list">
        {tasks.map((task) => (
          <li
            className={`quest-item ${
              task.isCompleted ? "task-item-completed" : ""
            } ${celebratedIds.includes(task.id) ? "quest-just-completed" : ""}`}
            key={task.id}
          >
            <button className="quest-check" type="button" disabled={isBusy || task.isCompleted}
              aria-label={task.isCompleted ? `${task.title} completed` : `Complete ${task.title}`}
              aria-busy={completingId === task.id} onClick={() => void handleComplete(task)}>
              {completingId === task.id ? "…" : task.isCompleted ? "✓" : ""}
            </button>
            <div className="quest-description">
              <h3>{task.title}</h3>
              <p className="muted">
                {task.isCompleted ? "Completed" : task.kind === "daily" ? "Daily" : "One-time"}
                {!task.isCompleted && ` · ${difficultyLabels[task.difficulty]}`}
              </p>

            </div>

            <div className="quest-reward-text">+{task.difficulty === "easy" ? 20 : task.difficulty === "medium" ? 40 : 60} XP&nbsp; +{task.difficulty === "easy" ? 10 : task.difficulty === "medium" ? 20 : 30} gold</div>
            <div className="task-actions">
              {confirmDeleteId === task.id ? (
                <>
                  <span className="task-delete-question">Delete?</span>
                  <button
                    className="task-delete-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleDelete(task.id)}
                    aria-label={`Confirm deletion of ${task.title}`}
                  >
                    {deletingId === task.id ? "Deleting…" : "Yes"}
                  </button>
                  <button
                    className="task-cancel-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {!task.isCompleted && <button className="task-edit-button" type="button" disabled={isBusy} aria-label={`Edit ${task.title}`}
                    onClick={() => {
                      setEditingTask(task); setTitle(task.title); setKind(task.kind); setDifficulty(task.difficulty);
                      setConfirmDeleteId(null); setActionError(""); setNotice(""); setIsCreateOpen(true);
                      window.requestAnimationFrame(() => {
                        document.getElementById("new-quest-form")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                        document.getElementById("task-title")?.focus({ preventScroll: true });
                      });
                    }}>Edit</button>}
                  <button
                    className="task-delete-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setActionError("");
                      setConfirmDeleteId(task.id);
                    }}
                    aria-label={`Delete ${task.title}`}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isLoading && (
        <p className="task-loading muted" role="status">
          Loading quests…
        </p>
      )}

      {loadError && (
        <div className="task-load-error">
          <p className="task-error" role="alert">
            {loadError}
          </p>
          <button
            className="button button-secondary"
            type="button"
            disabled={isBusy}
            onClick={() => {
              setIsLoading(true);
              setLoadError("");
              setReloadCount((current) => current + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}

      {nextCursor && !loadError && (
        <div className="task-pagination">
          <button
            className="button button-secondary"
            type="button"
            disabled={isBusy}
            onClick={() => {
              setIsLoading(true);
              setCursor(nextCursor);
            }}
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {tasks.length > 0 && <div className="quest-completion">
        <p>{tasks.filter(task => task.isCompleted).length} of {tasks.length}{nextCursor ? " loaded" : ""} quests completed</p>
        <progress aria-label="Completed quests" value={tasks.filter(task => task.isCompleted).length} max={tasks.length} />
      </div>}
    </section>
  );
}
