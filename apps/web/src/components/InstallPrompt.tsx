import { t } from "../lib/i18n";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./install-prompt.css";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isStandalone(): boolean {
  const browserNavigator = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    browserNavigator.standalone === true
  );
}

function isAppleMobile(): boolean {
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

export default function InstallPrompt() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const installingRef = useRef(false);

  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(isStandalone);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState("");
  const [appleMobile] = useState(isAppleMobile);

  const dialogId = useId();
  const titleId = useId();

  const openInstructions = useCallback(() => {
    const dialog = dialogRef.current;

    if (!dialog || dialog.open) return;

    setError("");
    dialog.showModal();
  }, []);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    function handleInstallPrompt(event: Event) {
      if (isStandalone()) return;

      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setError("");
    }

    function handleInstalled() {
      dialogRef.current?.close();
      setInstalled(true);
      setInstallEvent(null);
      setError("");
    }

    function handleDisplayModeChange() {
      const standalone = isStandalone();

      if (standalone) {
        dialogRef.current?.close();
      }

      setInstalled(standalone);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("questrealm:open-install", openInstructions);
    displayMode.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("questrealm:open-install", openInstructions);
      displayMode.removeEventListener("change", handleDisplayModeChange);
    };
  }, [openInstructions]);

  async function handleInstall() {
    if (!installEvent || installingRef.current) return;

    const currentEvent = installEvent;

    installingRef.current = true;
    setIsInstalling(true);
    setError("");

    dialogRef.current?.close();

    try {
      await currentEvent.prompt();

      const choice = await currentEvent.userChoice;

      setInstallEvent(null);

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
    } catch {
      setInstallEvent(null);
      setError("Use your browser’s menu to add QuestRealm to your device.");

      if (dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
    } finally {
      installingRef.current = false;
      setIsInstalling(false);
    }
  }

  if (installed) return null;

  return (
    <>
      <button
        className="install-launcher"
        type="button"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        disabled={isInstalling}
        onClick={openInstructions}
      >
        <span aria-hidden="true">↓</span> {t("Install app")} </button>

      <dialog
        ref={dialogRef}
        id={dialogId}
        className="install-dialog"
        aria-labelledby={titleId}
      >
        <div className="install-dialog-heading">
          <span className="install-dialog-mark" aria-hidden="true">
            Q
          </span>

          <button
            className="install-dialog-close"
            type="button"
            aria-label="Close installation guide"
            autoFocus
            onClick={() => dialogRef.current?.close()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <p className="eyebrow">{t("Take your realm with you")}</p>
        <h2 id={titleId}>{t("QuestRealm on your home screen")}</h2>

        <p className="install-description"> {t("Open your quests and focus timer with one tap, directly from your device.")} </p>

        {installEvent ? (
          <button
            className="button button-primary install-dialog-action"
            type="button"
            disabled={isInstalling}
            onClick={() => void handleInstall()}
          >
            {isInstalling ? "Opening installer…" : t("Install QuestRealm")}
          </button>
        ) : appleMobile ? (
          <ol className="install-steps">
            <li>
              <span aria-hidden="true">1</span>
              <p> {t("Open your browser’s")} <strong>{t("Share")}</strong> {t("menu.")} </p>
            </li>
            <li>
              <span aria-hidden="true">2</span>
              <p> {t("Choose")} <strong>{t("Add to Home Screen")}</strong>.
              </p>
            </li>
            <li>
              <span aria-hidden="true">3</span>
              <p> {t("Keep the name")} <strong>QuestRealm</strong> {t("and tap")}{" "}
                <strong>{t("Add")}</strong>.
              </p>
            </li>
          </ol>
        ) : (
          <div className="install-browser-guide">
            <p> {t("Open your browser’s menu and look for")} <strong>{t("Install app")}</strong>
              , <strong>{t("Add to Home Screen")}</strong> {t("or")}{" "}
              <strong>{t("Add to Dock")}</strong>.
            </p>
            <p>{t("Available options depend on your browser and device.")}</p>
          </div>
        )}

        {error && (
          <p className="install-dialog-error" role="alert">
            {t(error)}
          </p>
        )}

        <p className="install-dialog-note"> {t("Saving changes and earning quest rewards still require an internet connection.")} </p>
      </dialog>
    </>
  );
}
