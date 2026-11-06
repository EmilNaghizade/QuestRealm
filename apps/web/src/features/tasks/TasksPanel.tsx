import { t } from "../../lib/i18n";
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
            : t("Unable to load quests. Please try again."),
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
      setActionError(t("Enter a quest title."));
      return;
    }

    setIsCreating(true);
    setActionError("");
    setNotice("");

    try {
      if (editingTask && tasks.find(task => task.id === editingTask.id)?.isCompleted) {
        setActionError(t("Completed quests cannot be edited."));
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
        editingTask ? t("Quest updated.") : hasFilters
          ? t("Quest created. Your current filters still apply.")
          : t("Your new quest is ready."),
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
          : editingTask ? t("Unable to update your quest. Please try again.") : t("Unable to create your quest. Please try again."),
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
          t("This quest was already completed. No extra reward was added."),
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
            t("Your balance could not be refreshed. Reload to check it."),
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
          : t("Unable to complete your quest. Please try again."),
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
      setNotice(t(`${count} quests deleted. Your XP and gold are unchanged.`));
      refreshFromStart();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setActionError(error instanceof ApiError ? error.message : t("Unable to delete quests. Please try again."));
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
      setNotice(t("Quest deleted."));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      if (error instanceof ApiError && error.status === 404) {
        setTasks((current) => current.filter((task) => task.id !== id));
        setConfirmDeleteId(null);
        setNotice(t("This quest is no longer available."));
        return;
      }

      setActionError(
        error instanceof ApiError
          ? error.message
          : t("Unable to delete your quest. Please try again."),
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
        <h2 id="quests-title">{t("Your quests")}</h2>
        <div className="quest-toolbar">
        <button className="button task-delete-all" type="button" disabled={isBusy} aria-expanded={confirmDeleteAll} aria-controls="delete-all-confirmation" onClick={() => { setConfirmDeleteAll(current => !current); setConfirmDeleteId(null); }}>{t("Delete all")}</button>
        <button className="button button-secondary" type="button" aria-expanded={isCreateOpen} aria-controls="new-quest-form"
          disabled={isBusy} onClick={() => {
            setEditingTask(null); setTitle(""); setKind("daily"); setDifficulty("easy");
            setActionError(""); setIsCreateOpen(true);
          }}>{t("＋ New quest")}</button>
        </div>
      </div>
      {confirmDeleteAll && <section className="delete-all-confirmation" id="delete-all-confirmation" aria-labelledby="delete-all-title">
        <h3 id="delete-all-title">{t("Delete all quests?")}</h3>
        <p>{t("This removes every quest, including completed quests and quests outside the current filter. Your XP and gold stay unchanged.")}</p>
        <div className="quest-toolbar"><button className="button button-secondary" type="button" disabled={isBusy} onClick={() => setConfirmDeleteAll(false)}>{t("Cancel")}</button>
        <button className="button task-delete-all-confirm" type="button" disabled={isBusy} onClick={() => void handleDeleteAll()}>{isDeletingAll ? t("Deleting…") : t("Delete all quests")}</button></div>
      </section>}
      <div className="task-tabs" role="group" aria-label={t("Quest type")}>
        {([{ value: undefined, label: t("All") }, { value: "daily", label: t("Daily") }, { value: "once", label: t("One-time") }] as const).map(tab => (
          <button key={t(tab.label)} type="button" aria-pressed={filters.kind === tab.value} disabled={isBusy}
            onClick={() => changeFilters({ kind: tab.value })}>{t(tab.label)}</button>
        ))}
      </div>
      <div className="task-create-panel" id="new-quest-form" hidden={!isCreateOpen}>
        <div className="task-editor-heading"><h3>{editingTask ? t("Edit quest") : t("New quest")}</h3>
          <button className="auth-text-button" type="button" disabled={isBusy} onClick={() => { setIsCreateOpen(false); setEditingTask(null); setTitle(""); setActionError(""); }}>{t("Cancel")}</button></div>
        <form onSubmit={handleCreate}>
          <fieldset className="task-form-fields" disabled={isBusy}>
            <legend className="auth-sr-only">{t("New quest details")}</legend>

            <div className="task-field task-title-field">
              <label htmlFor="task-title">{t("Quest title")}</label>
              <input
                id="task-title"
                name="title"
                placeholder={t("What would you like to accomplish?")}
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="task-field">
              <label htmlFor="task-kind">{t("Repeat")}</label>
              <select
                id="task-kind"
                value={kind}
                disabled={Boolean(editingTask && !editingTask.canChangeKind)}
                onChange={(event) =>
                  setKind(event.target.value as Task["kind"])
                }
              >
                <option value="daily">{t("Daily")}</option>
                <option value="once">{t("One-time")}</option>
              </select>
            </div>

            <div className="task-field">
              <label htmlFor="task-difficulty">{t("Difficulty")}</label>
              <select
                id="task-difficulty"
                value={difficulty}
                onChange={(event) =>
                  setDifficulty(event.target.value as Task["difficulty"])
                }
              >
                <option value="easy">{t("Easy")}</option>
                <option value="medium">{t("Medium")}</option>
                <option value="hard">{t("Hard")}</option>
              </select>
            </div>

            {editingTask && !editingTask.canChangeKind && <p className="muted task-kind-note">{t("Repeat type is fixed after the first completion. Past rewards stay unchanged.")}</p>}
            <button
              className="button button-primary task-create-button"
              type="submit"
            >
              {isCreating ? t("Saving…") : editingTask ? t("Save changes") : t("Add quest")}
            </button>
          </fieldset>
        </form>
      </div>

      {actionError && (
        <p className="task-error" role="alert">
          {t(actionError)}
        </p>
      )}

      <p className="task-notice" role="status">
        {t(notice)}
      </p>

      {tasks.length === 0 && !isLoading && !loadError && !nextCursor && (
        <div className="task-empty">
          <span className="quest-marker" aria-hidden="true">
            ◇
          </span>
          <h3>
            {hasFilters
              ? t("No quests match these filters.")
              : t("Your next adventure starts here.")}
          </h3>
          <p className="muted">
            {hasFilters
              ? t("Try different filters or create a new quest.")
              : t("Create a small, meaningful quest for today.")}
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
              aria-label={task.isCompleted ? `${task.title} completed` : t(`Complete ${task.title}`)}
              aria-busy={completingId === task.id} onClick={() => void handleComplete(task)}>
              {completingId === task.id ? "…" : task.isCompleted ? "✓" : ""}
            </button>
            <div className="quest-description">
              <h3>{task.title}</h3>
              <p className="muted">
                {task.isCompleted ? t("Completed") : task.kind === "daily" ? t("Daily") : t("One-time")}
                {!task.isCompleted && t(` · ${t(difficultyLabels[task.difficulty])}`)}
              </p>

            </div>

            <div className="quest-reward-text">+{task.difficulty === "easy" ? 20 : task.difficulty === "medium" ? 40 : 60} {t("XP")} +{task.difficulty === "easy" ? 10 : task.difficulty === "medium" ? 20 : 30} {t("gold")}</div>
            <div className="task-actions">
              {confirmDeleteId === task.id ? (
                <>
                  <span className="task-delete-question">{t("Delete?")}</span>
                  <button
                    className="task-delete-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleDelete(task.id)}
                    aria-label={t(`Confirm deletion of ${task.title}`)}
                  >
                    {deletingId === task.id ? t("Deleting…") : t("Yes")}
                  </button>
                  <button
                    className="task-cancel-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => setConfirmDeleteId(null)}
                  > {t("Cancel")} </button>
                </>
              ) : (
                <>
                  {!task.isCompleted && <button className="task-edit-button" type="button" disabled={isBusy} aria-label={t(`Edit ${task.title}`)}
                    onClick={() => {
                      setEditingTask(task); setTitle(task.title); setKind(task.kind); setDifficulty(task.difficulty);
                      setConfirmDeleteId(null); setActionError(""); setNotice(""); setIsCreateOpen(true);
                      window.requestAnimationFrame(() => {
                        document.getElementById("new-quest-form")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                        document.getElementById("task-title")?.focus({ preventScroll: true });
                      });
                    }}>{t("Edit")}</button>}
                  <button
                    className="task-delete-button"
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setActionError("");
                      setConfirmDeleteId(task.id);
                    }}
                    aria-label={t(`Delete ${task.title}`)}
                  > {t("Delete")} </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {isLoading && (
        <p className="task-loading muted" role="status"> {t("Loading quests…")} </p>
      )}

      {loadError && (
        <div className="task-load-error">
          <p className="task-error" role="alert">
            {t(loadError)}
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
          > {t("Try again")} </button>
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
            {isLoading ? t("Loading…") : t("Load more")}
          </button>
        </div>
      )}

      {tasks.length > 0 && <div className="quest-completion">
        <p>{t("{0} of {1} quests completed",{0:tasks.filter(task => task.isCompleted).length,1:tasks.length})}{nextCursor ? " +" : ""}</p>
        <progress aria-label={t("Completed quests")} value={tasks.filter(task => task.isCompleted).length} max={tasks.length} />
      </div>}
    </section>
  );
}
