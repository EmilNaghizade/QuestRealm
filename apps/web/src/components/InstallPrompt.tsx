import { useEffect, useRef, useState } from "react";
import "./install-prompt.css";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState("");

  const installingRef = useRef(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");

    function handleInstallPrompt(event: Event) {
      if (isStandalone()) return;

      event.preventDefault();

      setInstallEvent(event as InstallPromptEvent);
      setDismissed(false);
      setError("");
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallEvent(null);
      setError("");
    }

    function handleDisplayModeChange() {
      setInstalled(isStandalone());
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent || installingRef.current) return;

    const currentEvent = installEvent;

    installingRef.current = true;
    setIsInstalling(true);
    setError("");

    try {
      await currentEvent.prompt();

      const choice = await currentEvent.userChoice;

      if (choice.outcome === "accepted") {
        setInstalled(true);
      }

      // Each browser installation event can only be used once.
      setInstallEvent(null);
    } catch {
      setInstallEvent(null);
      setError(
        "Installation could not start. You can also use your browser’s install option.",
      );
    } finally {
      installingRef.current = false;
      setIsInstalling(false);
    }
  }

  if (installed || dismissed || (!installEvent && !error)) {
    return null;
  }

  return (
    <section className="install-prompt" aria-labelledby="install-prompt-title">
      <button
        className="install-prompt-dismiss"
        type="button"
        aria-label="Dismiss installation suggestion"
        disabled={isInstalling}
        onClick={() => setDismissed(true)}
      >
        <span aria-hidden="true">×</span>
      </button>

      <span className="install-prompt-icon" aria-hidden="true">
        Q
      </span>

      <div className="install-prompt-copy">
        <h2 id="install-prompt-title">Your realm, one tap away.</h2>

        <p>Add QuestRealm to your device and open it like an app.</p>
      </div>

      {installEvent && (
        <button
          className="button button-primary install-prompt-button"
          type="button"
          disabled={isInstalling}
          onClick={() => void handleInstall()}
        >
          {isInstalling ? "Opening installer…" : "Install QuestRealm"}
        </button>
      )}

      {error && (
        <p className="install-prompt-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
