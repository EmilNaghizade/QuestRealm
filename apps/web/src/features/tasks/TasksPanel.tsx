import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api";
import { getCurrentUser, type PlayerBalance } from "../auth/auth-api";
import {
  completeTask,
  createTask,
  deleteTask,
  getTasks,
  type Task,
  type TaskFilters,
} from "./tasks-api";
import "./tasks.css";

type TasksPanelProps = {
  onSessionExpired: () => void;
  onBalanceChanged: (balance: PlayerBalance) => void;
};

const difficultyLabels = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function TasksPanel({
  onSessionExpired,
  onBalanceChanged,
}: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({});
  const [cursor, setCursor] = useState<string | undefined>();
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Task["kind"]>("daily");
  const [difficulty, setDifficulty] = useState<Task["difficulty"]>("easy");

  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isBusy =
    isLoading || isCreating || deletingId !== null || completingId !== null;

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
        task.id === id ? { ...task, isCompleted: true } : task,
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
      await createTask({
        title: cleanTitle,
        kind,
        difficulty,
      });

      setTitle("");
      setNotice(
        hasFilters
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
          : "Unable to create your quest. Please try again.",
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
      onBalanceChanged(result.balance);

      setNotice(
        `Quest completed! +${result.reward.xp} XP and ` +
          `+${result.reward.gold} gold.`,
      );
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
        <div>
          <p className="eyebrow">One step at a time</p>
          <h2 id="quests-title">Your quests</h2>
        </div>

        <button
          className="button button-secondary"
          type="button"
          disabled={isBusy}
          onClick={() => {
            setConfirmDeleteId(null);
            refreshFromStart();
          }}
        >
          Refresh
        </button>
      </div>

      <details className="task-create-panel">
        <summary>Create a quest</summary>

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

            <button
              className="button button-primary task-create-button"
              type="submit"
            >
              {isCreating ? "Creating…" : "Add quest"}
            </button>
          </fieldset>
        </form>
      </details>

      <fieldset className="task-form-fields" disabled={isBusy}>
        <legend className="auth-sr-only">Filter your quests</legend>

        <div className="task-field">
          <label htmlFor="quest-filter-kind">Quest type</label>
          <select
            id="quest-filter-kind"
            value={filters.kind ?? ""}
            onChange={(event) =>
              changeFilters({
                ...filters,
                kind: (event.target.value as Task["kind"]) || undefined,
              })
            }
          >
            <option value="">All types</option>
            <option value="daily">Daily</option>
            <option value="once">One-time</option>
          </select>
        </div>

        <div className="task-field">
          <label htmlFor="quest-filter-difficulty">Difficulty</label>
          <select
            id="quest-filter-difficulty"
            value={filters.difficulty ?? ""}
            onChange={(event) =>
              changeFilters({
                ...filters,
                difficulty:
                  (event.target.value as Task["difficulty"]) || undefined,
              })
            }
          >
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="task-field">
          <label htmlFor="quest-filter-status">Status</label>
          <select
            id="quest-filter-status"
            value={filters.status ?? ""}
            onChange={(event) =>
              changeFilters({
                ...filters,
                status:
                  (event.target.value as "active" | "completed") || undefined,
              })
            }
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="task-field">
          <button
            className="button button-secondary"
            type="button"
            disabled={!hasFilters}
            onClick={() => changeFilters({})}
          >
            Clear filters
          </button>
        </div>
      </fieldset>

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
            }`}
            key={task.id}
          >
            <span className="quest-marker" aria-hidden="true">
              {task.isCompleted ? "✓" : "◇"}
            </span>

            <div className="quest-description">
              <h3>{task.title}</h3>
              <p className="muted">
                {task.kind === "daily" ? "Daily quest" : "One-time quest"}
                {" · "}
                {difficultyLabels[task.difficulty]}
              </p>

              {task.isCompleted && (
                <span className="task-completed-label">
                  {task.kind === "daily" ? "Completed today" : "Completed"}
                </span>
              )}
            </div>

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
                  {!task.isCompleted && (
                    <button
                      className="button button-primary task-complete-button"
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleComplete(task)}
                      aria-label={`Complete ${task.title}`}
                    >
                      {completingId === task.id ? "Completing…" : "Complete"}
                    </button>
                  )}

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

      <p className="section-footnote">
        Daily quests reset with your account’s local day. Use Refresh to check
        for updates.
      </p>
    </section>
  );
}
