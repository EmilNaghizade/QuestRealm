import { useCallback, useEffect, useState } from "react";
import ConnectionStatus from "./components/ConnectionStatus";
import InstallPrompt from "./components/InstallPrompt";
import MobileNavigation from "./components/MobileNavigation";
import AuthScreen from "./features/auth/AuthScreen";
import Dashboard from "./features/dashboard/Dashboard";
import ChooseCharacter from "./features/character/ChooseCharacter";
import FocusProvider from "./features/focus/FocusProvider";
import FocusSoundProvider from "./features/focus/FocusSoundProvider";
import {
  getCurrentUser,
  logout,
  type AuthUser,
  type PlayerBalance,
} from "./features/auth/auth-api";
import { ApiError } from "./lib/api";

type SessionState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "anonymous" }
  | { status: "error"; message: string };

function AppContent() {
  const [session, setSession] = useState<SessionState>({
    status: "loading",
  });
  const [retryCount, setRetryCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleSessionExpired = useCallback(() => {
    setLogoutError("");
    setSession({ status: "anonymous" });
  }, []);

  const handleBalanceChanged = useCallback((balance: PlayerBalance) => {
    setSession((current) => {
      if (current.status !== "authenticated") {
        return current;
      }

      return {
        status: "authenticated",
        user: {
          ...current.user,
          xp: balance.xp,
          gold: balance.gold,
          progression: balance.progression,
        },
      };
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      try {
        const user = await getCurrentUser(controller.signal);

        if (!controller.signal.aborted) {
          setSession({ status: "authenticated", user });
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.status === 401) {
          setSession({ status: "anonymous" });
          return;
        }

        setSession({
          status: "error",
          message:
            error instanceof ApiError
              ? error.message
              : "Unable to check your session. Please try again.",
        });
      }
    }

    void restoreSession();

    return () => controller.abort();
  }, [retryCount]);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError("");

    try {
      await logout();
      setSession({ status: "anonymous" });
    } catch (error) {
      setLogoutError(
        error instanceof ApiError
          ? error.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (session.status === "loading") {
    return (
      <main className="session-screen">
        <div className="session-panel" role="status">
          <span className="eyebrow">QuestRealm</span>
          <h1>Preparing your adventure…</h1>
          <p className="muted">Checking your session.</p>
        </div>
      </main>
    );
  }

  if (session.status === "error") {
    return (
      <main className="session-screen">
        <div className="card session-panel">
          <h1>Let’s reconnect.</h1>

          <p className="muted" role="alert">
            {session.message}
          </p>

          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setSession({ status: "loading" });
              setRetryCount((current) => current + 1);
            }}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (session.status === "anonymous") {
    return (
      <AuthScreen
        onAuthenticated={(user) => {
          setLogoutError("");
          setSession({ status: "authenticated", user });
        }}
      />
    );
  }

  return (
    <>
      <div className="account-bar">
        <span>
          Signed in as <strong>{session.user.displayName}</strong>
        </span>

        {logoutError && (
          <span className="account-bar-error" role="alert">
            {logoutError}
          </span>
        )}

        <button
          className="button button-secondary"
          type="button"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
        >
          {isLoggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {session.user.characterId === null ? (
        <ChooseCharacter
          onSessionExpired={handleSessionExpired}
          onSelected={(characterId) => {
            setSession((current) => {
              if (current.status !== "authenticated") {
                return current;
              }

              return {
                status: "authenticated",
                user: { ...current.user, characterId },
              };
            });
          }}
        />
      ) : (
        <>
          <MobileNavigation />

          <FocusProvider
            key={session.user.id}
            onSessionExpired={handleSessionExpired}
          >
            <FocusSoundProvider>
              <Dashboard
                user={session.user}
                onSessionExpired={handleSessionExpired}
                onBalanceChanged={handleBalanceChanged}
              />
            </FocusSoundProvider>
          </FocusProvider>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <>
      <ConnectionStatus />
      <AppContent />
      <InstallPrompt />
    </>
  );
}
