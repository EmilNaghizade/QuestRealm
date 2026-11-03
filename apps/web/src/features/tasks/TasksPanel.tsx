import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api";
import { createTask, deleteTask, getTasks, type Task } from "./tasks-api";
import "./tasks.css";

type TasksPanelProps = {
  onSessionExpired: () => void;
};

const difficultyLabels = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function TasksPanel({ onSessionExpired }: TasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isBusy = isLoading || isCreating || deletingId !== null;

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      try {
        const response = await getTasks(cursor, controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setTasks((current) => {
          if (!cursor) {
            return response.data.tasks;
          }

          const merged = new Map(current.map((task) => [task.id, task]));

          for (const task of response.data.tasks) {
            merged.set(task.id, task);
          }

          return [...merged.values()];
        });

        setNextCursor(response.meta.nextCursor);
        setLoadError("");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

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
  }, [cursor, reloadCount, onSessionExpired]);

  function refreshFromStart() {
    setIsLoading(true);
    setLoadError("");
    setCursor(undefined);
    setReloadCount((current) => current + 1);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

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
      setNotice("Your new quest is ready.");
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

  async function handleDelete(id: string) {
    if (isBusy) {
      return;
    }

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

        <span className="quest-count">{tasks.length} loaded</span>
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

      {actionError && (
        <p className="task-error" role="alert">
          {actionError}
        </p>
      )}

      <p className="task-notice" role="status">
        {notice}
      </p>

      {tasks.length === 0 && !isLoading && !loadError && (
        <div className="task-empty">
          <span className="quest-marker" aria-hidden="true">
            ◇
          </span>
          <h3>Your next adventure starts here.</h3>
          <p className="muted">Create a small, meaningful quest for today.</p>
        </div>
      )}

      <ul className="quest-list task-list">
        {tasks.map((task) => (
          <li className="quest-item" key={task.id}>
            <span className="quest-marker" aria-hidden="true">
              ◇
            </span>

            <div className="quest-description">
              <h3>{task.title}</h3>

              <p className="muted">
                {task.kind === "daily" ? "Daily quest" : "One-time quest"}
                {" · "}
                {difficultyLabels[task.difficulty]}
              </p>
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
        Your quests are saved to your account. Completion and rewards are coming
        next.
      </p>
    </section>
  );
}
