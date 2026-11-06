import { t, locale } from "../../lib/i18n";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import { useFocus } from "./focus-context";
import { useFocusSound } from "./focus-sound-context";
import type { FocusMode, FocusSettings } from "./focus-api";
import "./focus.css";

const modes: { id: FocusMode; label: string }[] = [
  { id: "focus", label: "Focus" },
  { id: "shortBreak", label: "Short break" },
  { id: "longBreak", label: "Long break" },
];

type TimerConfirmation = {
  revision: number;
  cycleId: string | null;
} & ({ action: "reset" } | { action: "switchMode"; mode: FocusMode });

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return t(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`);
}

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isSubmitting: boolean;
  confirmDisabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  isSubmitting,
  confirmDisabled,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="focus-confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={isSubmitting}
      onCancel={(event) => {
        event.preventDefault();

        if (!isSubmitting) {
          onCancel();
        }
      }}
      onClose={onCancel}
    >
      <div className="focus-confirm-content">
        <span className="focus-confirm-icon" aria-hidden="true">
          ↺
        </span>

        <p className="eyebrow">{t("Your focus journey")}</p>
        <h2 id={titleId}>{title}</h2>
        <p className="focus-confirm-description" id={descriptionId}>
          {description}
        </p>

        <div className="focus-confirm-actions">
          <button
            className="button button-secondary"
            type="button"
            autoFocus
            disabled={isSubmitting}
            onClick={onCancel}
          > {t("Keep going")} </button>

          <button
            className="button button-primary"
            type="button"
            disabled={confirmDisabled || isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? t("Please wait…") : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

type SettingsFormProps = {
  settings: FocusSettings;
  disabled: boolean;
  onSave: (settings: FocusSettings) => Promise<boolean>;
};

function SettingsForm({ settings, disabled, onSave }: SettingsFormProps) {
  const [focusMinutes, setFocusMinutes] = useState(
    String(settings.focusMinutes),
  );
  const [shortBreakMinutes, setShortBreakMinutes] = useState(
    String(settings.shortBreakMinutes),
  );
  const [longBreakMinutes, setLongBreakMinutes] = useState(
    String(settings.longBreakMinutes),
  );
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (disabled) return;

    const nextSettings: FocusSettings = {
      focusMinutes: Number(focusMinutes),
      shortBreakMinutes: Number(shortBreakMinutes),
      longBreakMinutes: Number(longBreakMinutes),
    };

    const valid =
      Number.isInteger(nextSettings.focusMinutes) &&
      nextSettings.focusMinutes >= 1 &&
      nextSettings.focusMinutes <= 180 &&
      Number.isInteger(nextSettings.shortBreakMinutes) &&
      nextSettings.shortBreakMinutes >= 1 &&
      nextSettings.shortBreakMinutes <= 60 &&
      Number.isInteger(nextSettings.longBreakMinutes) &&
      nextSettings.longBreakMinutes >= 1 &&
      nextSettings.longBreakMinutes <= 120;

    if (!valid) {
      setValidationError(t("Enter whole minutes within the allowed ranges."));
      return;
    }

    setValidationError("");
    await onSave(nextSettings);
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset className="focus-settings-fields" disabled={disabled}>
        <legend className="auth-sr-only">{t("Timer durations")}</legend>

        <div className="focus-field">
          <label htmlFor="focus-minutes">{t("Focus · 1–180 min")}</label>
          <input
            id="focus-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={180}
            step={1}
            required
            value={focusMinutes}
            onChange={(event) => setFocusMinutes(event.target.value)}
          />
        </div>

        <div className="focus-field">
          <label htmlFor="short-break-minutes">{t("Short break · 1–60 min")}</label>
          <input
            id="short-break-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            step={1}
            required
            value={shortBreakMinutes}
            onChange={(event) => setShortBreakMinutes(event.target.value)}
          />
        </div>

        <div className="focus-field">
          <label htmlFor="long-break-minutes">{t("Long break · 1–120 min")}</label>
          <input
            id="long-break-minutes"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            step={1}
            required
            value={longBreakMinutes}
            onChange={(event) => setLongBreakMinutes(event.target.value)}
          />
        </div>
      </fieldset>

      {validationError && (
        <p className="focus-message focus-error" role="alert">
          {t(validationError)}
        </p>
      )}

      <div className="focus-settings-actions">
        <p className="muted">{t("Your durations are saved to your account.")}</p>

        <button
          className="button button-primary focus-save-button"
          type="submit"
          disabled={disabled}
        > {t("Save durations")} </button>
      </div>
    </form>
  );
}

function SoundControls() {
  const { enabled, volume, isReady, error, setEnabled, setVolume, preview } =
    useFocusSound();

  const percentage = Math.round(volume * 100);

  const rangeStyle = {
    "--range-fill": `${percentage}%`,
  } as CSSProperties;

  return (
    <section className="card focus-center" aria-labelledby="focus-sound-title">
      <h2 id="focus-sound-title">{t("A gentle reminder")}</h2>

      <p className="muted focus-settings-description"> {t("A little melody to mark your progress. Sound preferences are saved on this device.")} </p>

      <div className="focus-sound-controls">
        <div className="focus-sound-item">
          <span className="focus-control-label" id="focus-sound-toggle-label"> {t("Session end sound")} </span>

          <button
            className={`button ${
              enabled ? "button-primary" : "button-secondary"
            }`}
            type="button"
            aria-labelledby="focus-sound-toggle-label"
            aria-pressed={enabled}
            onClick={() => setEnabled(!enabled)}
          >
            <span aria-hidden="true">♪</span>
            {enabled ? t("Sound on") : t("Sound off")}
          </button>
        </div>

        <div className="focus-sound-item focus-volume">
          <div className="focus-volume-heading">
            <label htmlFor="focus-sound-volume">{t("Volume")}</label>
            <span className="focus-volume-value">{percentage}%</span>
          </div>

          <div className="focus-volume-slider">
            <input
              className="focus-volume-range"
              id="focus-sound-volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={percentage}
              style={rangeStyle}
              disabled={!enabled}
              aria-valuetext={t(`${percentage} percent`)}
              onChange={(event) => setVolume(Number(event.target.value) / 100)}
            />
          </div>
        </div>

        <div className="focus-sound-item">
          <span className="focus-control-label" id="focus-sound-preview-label"> {t("Hear the melody")} </span>

          <button
            className="button button-secondary"
            type="button"
            disabled={!enabled}
            aria-describedby="focus-sound-preview-label"
            onClick={() => void preview()}
          >
            <span aria-hidden="true">▷</span> {t("Preview sound")} </button>
        </div>
      </div>

      <p className="focus-message" role="status">
        {!enabled
          ? t("Session sounds are off.")
          : volume === 0
            ? t("Volume is set to zero.")
            : isReady
              ? t("Audio is ready for this visit.")
              : t("Tap Preview sound to enable audio.")}
      </p>

      {error && (
        <p className="focus-message focus-error" role="alert">
          {t(error)}
        </p>
      )}

      <p className="section-footnote"> {t("Keep the app open for sound alerts. Your browser may suspend audio when the device is locked or the app is in the background.")} </p>
    </section>
  );
}

export default function FocusCenter() {
  const {
    timer,
    remainingMs,
    isBusy,
    error,
    refresh,
    sendCommand,
    saveSettings,
  } = useFocus();

  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<TimerConfirmation | null>(
    null,
  );
  const [isConfirming, setIsConfirming] = useState(false);

  if (!timer) {
    return (
      <section className="card focus-center">
        <h2>{t("Focus Center")}</h2>

        {error ? (
          <>
            <p className="focus-message focus-error" role="alert">
              {t(error)}
            </p>

            <button
              className="button button-secondary"
              type="button"
              disabled={isBusy}
              onClick={() => void refresh()}
            >
              {isBusy ? t("Connecting…") : t("Try again")}
            </button>
          </>
        ) : (
          <p className="muted" role="status"> {t("Preparing your focus space…")} </p>
        )}
      </section>
    );
  }

  const isFinishing = timer.status === "running" && remainingMs === 0;

  const controlsDisabled = isBusy || isFinishing;

  const currentMode = modes.find((mode) => mode.id === timer.mode);

  const statusLabel = isFinishing
    ? t("Finishing session…")
    : timer.status === "running"
      ? t("In progress")
      : timer.status === "paused"
        ? t("Paused")
        : t("Ready when you are");

  async function handleModeChange(mode: FocusMode) {
    if (!timer || controlsDisabled || timer.mode === mode) {
      return;
    }

    setNotice("");

    if (timer.status !== "idle") {
      setConfirmation({
        action: "switchMode",
        mode,
        revision: timer.revision,
        cycleId: timer.cycleId,
      });
      return;
    }

    await sendCommand({
      action: "switchMode",
      mode,
    });
  }

  function handleReset() {
    if (!timer || controlsDisabled || timer.status === "idle") {
      return;
    }

    setNotice("");
    setConfirmation({
      action: "reset",
      revision: timer.revision,
      cycleId: timer.cycleId,
    });
  }

  async function handleConfirm() {
    if (!timer || !confirmation || controlsDisabled || isConfirming) {
      return;
    }

    if (
      timer.revision !== confirmation.revision ||
      timer.cycleId !== confirmation.cycleId
    ) {
      setConfirmation(null);
      setNotice(
        t("Your timer changed while this dialog was open. Review it and try again."),
      );
      return;
    }

    setIsConfirming(true);

    try {
      const changed =
        confirmation.action === "reset"
          ? await sendCommand({ action: "reset" })
          : await sendCommand({
              action: "switchMode",
              mode: confirmation.mode,
            });

      setConfirmation(null);

      if (!changed) {
        setNotice(t("Review your current timer before trying again."));
      }
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleSaveSettings(settings: FocusSettings): Promise<boolean> {
    setNotice("");

    const saved = await saveSettings(settings);

    if (saved) {
      setNotice(t("Your timer durations have been saved."));
    }

    return saved;
  }

  const isModeConfirmation = confirmation?.action === "switchMode";

  const targetModeLabel =
    confirmation?.action === "switchMode"
      ? modes.find((mode) => mode.id === confirmation.mode)?.label
      : "";

  return (
    <div className="focus-center-layout">
      <section
        className="card focus-center"
        aria-labelledby="focus-center-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t("One thing at a time")}</p>
            <h2 id="focus-center-title">{t("Focus Center")}</h2>
          </div>

          <button
            className="button button-secondary"
            type="button"
            disabled={isBusy}
            onClick={() => void refresh()}
          >
            {isBusy ? t("Syncing…") : t("Refresh")}
          </button>
        </div>

        <div
          className="focus-mode-buttons"
          role="group"
          aria-label={t("Timer mode")}
        >
          {modes.map((mode) => (
            <button
              className={`button ${
                timer.mode === mode.id ? "button-primary" : "button-secondary"
              }`}
              type="button"
              key={mode.id}
              aria-pressed={timer.mode === mode.id}
              disabled={controlsDisabled}
              onClick={() => void handleModeChange(mode.id)}
            >
              {t(mode.label)}
            </button>
          ))}
        </div>

        <div className="focus-timer-display">
          <p className="eyebrow">{t(currentMode?.label)}</p>

          <div
            className="focus-timer-value"
            role="timer"
            aria-label={t(`${t(currentMode?.label)} time remaining`)}
            aria-live="off"
          >
            {formatTime(remainingMs)}
          </div>

          <p className="muted" role="status">
            {t(statusLabel)}
          </p>
        </div>

        <progress
          value={Math.max(
            0,
            Math.min(timer.durationMs, timer.durationMs - remainingMs),
          )}
          max={timer.durationMs}
          aria-label={t(`${t(currentMode?.label)} progress`)}
        />

        <div className="focus-controls">
          {timer.status === "idle" && (
            <button
              className="button button-primary"
              type="button"
              disabled={controlsDisabled}
              onClick={() => {
                setNotice("");
                void sendCommand({ action: "start" });
              }}
            > {t("Start")} </button>
          )}

          {timer.status === "running" && (
            <button
              className="button button-primary"
              type="button"
              disabled={controlsDisabled}
              onClick={() => {
                setNotice("");
                void sendCommand({ action: "pause" });
              }}
            > {t("Pause")} </button>
          )}

          {timer.status === "paused" && (
            <button
              className="button button-primary"
              type="button"
              disabled={controlsDisabled}
              onClick={() => {
                setNotice("");
                void sendCommand({ action: "resume" });
              }}
            > {t("Resume")} </button>
          )}

          <button
            className="button button-secondary"
            type="button"
            disabled={controlsDisabled || timer.status === "idle"}
            onClick={handleReset}
          > {t("Reset")} </button>
        </div>

        {error && (
          <p className="focus-message focus-error" role="alert">
            {t(error)}
          </p>
        )}

        <p className="focus-message" role="status">
          {t(notice)}
        </p>

        <div className="focus-session-summary">
          <span className="stat-value">
            {new Intl.NumberFormat(locale()).format(timer.completedFocusCount)}
          </span>
          <span className="muted">{t("Completed focus sessions")}</span>
        </div>

        <p className="section-footnote"> {t("Focus ends with an automatic break. Every fourth focus earns a long break. Start your next focus when you are ready.")} </p>
      </section>

      <section
        className="card focus-center"
        aria-labelledby="focus-settings-title"
      >
        <h2 id="focus-settings-title">{t("Make it your rhythm")}</h2>

        <p className="muted focus-settings-description"> {t("Choose your durations before starting. Reset an active or paused timer to change them.")} </p>

        <SettingsForm
          key={[
            timer.settings.focusMinutes,
            timer.settings.shortBreakMinutes,
            timer.settings.longBreakMinutes,
          ].join(":")}
          settings={timer.settings}
          disabled={isBusy || timer.status !== "idle"}
          onSave={handleSaveSettings}
        />
      </section>

      <SoundControls />

      <ConfirmDialog
        open={confirmation !== null}
        title={
          isModeConfirmation ? t(`Switch to ${targetModeLabel}?`) : t("Start fresh?")
        }
        description={
          isModeConfirmation
            ? t("Switching modes will reset your current timer. An unfinished focus session will not be added to your history.")
            : t("This will reset your current timer. An unfinished focus session will not be added to your history. Your completed sessions stay saved.")
        }
        confirmLabel={isModeConfirmation ? t("Switch mode") : t("Reset timer")}
        isSubmitting={isConfirming}
        confirmDisabled={controlsDisabled}
        onCancel={() => {
          if (!isConfirming) {
            setConfirmation(null);
          }
        }}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}
