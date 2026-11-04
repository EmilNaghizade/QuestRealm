import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "../../lib/api";
import {
  getFocusTimer,
  performFocusAction,
  updateFocusSettings,
  type FocusSettings,
  type FocusTimer,
} from "./focus-api";
import {
  FocusContext,
  type CompletionEvent,
  type FocusCommand,
} from "./focus-context";

type FocusProviderProps = {
  children: ReactNode;
  onSessionExpired: () => void;
};

type RequestFunction = (signal: AbortSignal) => Promise<FocusTimer>;

export default function FocusProvider({
  children,
  onSessionExpired,
}: FocusProviderProps) {
  const [timer, setTimer] = useState<FocusTimer | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [isBusy, setIsBusy] = useState(true);
  const [error, setError] = useState("");
  const [completionEvent, setCompletionEvent] =
    useState<CompletionEvent | null>(null);

  const timerRef = useRef<FocusTimer | null>(null);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const lastAttemptRef = useRef(0);

  const clockRef = useRef({
    remainingMs: 0,
    receivedAt: 0,
  });

  const acceptTimer = useCallback(
    (nextTimer: FocusTimer, requestStartedAt: number) => {
      const previous = timerRef.current;
      const receivedAt = performance.now();

      const estimatedTravelMs = Math.max(
        0,
        (receivedAt - requestStartedAt) / 2,
      );

      const nextRemainingMs =
        nextTimer.status === "running"
          ? Math.max(0, nextTimer.remainingMs - estimatedTravelMs)
          : nextTimer.remainingMs;

      if (
        previous?.status === "running" &&
        previous.cycleId &&
        previous.endsAt &&
        previous.cycleId !== nextTimer.cycleId &&
        Date.parse(previous.endsAt) <= Date.parse(nextTimer.serverNow)
      ) {
        setCompletionEvent({
          cycleId: previous.cycleId,
          mode: previous.mode,
        });
      }

      clockRef.current = {
        remainingMs: nextRemainingMs,
        receivedAt,
      };

      timerRef.current = nextTimer;
      setTimer(nextTimer);
      setRemainingMs(nextRemainingMs);
    },
    [],
  );

  const runRequest = useCallback(
    async (request: RequestFunction, isMutation = false): Promise<boolean> => {
      if (!mountedRef.current || controllerRef.current) {
        return false;
      }

      const controller = new AbortController();
      const requestId = ++requestIdRef.current;

      controllerRef.current = controller;
      lastAttemptRef.current = performance.now();

      function isCurrentRequest() {
        return (
          mountedRef.current &&
          requestIdRef.current === requestId &&
          !controller.signal.aborted
        );
      }

      try {
        const startedAt = performance.now();
        const result = await request(controller.signal);

        if (!isCurrentRequest()) return false;

        setError("");
        acceptTimer(result, startedAt);

        return true;
      } catch (requestError) {
        if (!isCurrentRequest()) return false;

        if (requestError instanceof ApiError && requestError.status === 401) {
          onSessionExpired();
          return false;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Unable to connect to your timer. Please try again.",
        );

        if (
          isMutation &&
          requestError instanceof ApiError &&
          requestError.status === 409
        ) {
          try {
            const startedAt = performance.now();
            const latest = await getFocusTimer(controller.signal);

            if (!isCurrentRequest()) return false;

            acceptTimer(latest, startedAt);
          } catch (syncError) {
            if (!isCurrentRequest()) return false;

            if (syncError instanceof ApiError && syncError.status === 401) {
              onSessionExpired();
              return false;
            }

            setError(
              "Your timer changed, but its current state could not be loaded. Please refresh.",
            );
          }
        }

        return false;
      } finally {
        if (mountedRef.current && requestIdRef.current === requestId) {
          controllerRef.current = null;
          setIsBusy(false);
        }
      }
    },
    [acceptTimer, onSessionExpired],
  );

  const beginRequest = useCallback(
    (request: RequestFunction, isMutation = false): Promise<boolean> => {
      if (!mountedRef.current || controllerRef.current) {
        return Promise.resolve(false);
      }

      setIsBusy(true);
      setError("");

      return runRequest(request, isMutation);
    },
    [runRequest],
  );

  const refresh = useCallback(
    () => beginRequest((signal) => getFocusTimer(signal)),
    [beginRequest],
  );

  const sendCommand = useCallback(
    async (command: FocusCommand): Promise<boolean> => {
      const current = timerRef.current;

      if (!current) return false;

      return beginRequest(
        (signal) =>
          performFocusAction(
            {
              ...command,
              expectedRevision: current.revision,
            },
            signal,
          ),
        true,
      );
    },
    [beginRequest],
  );

  const saveSettings = useCallback(
    async (settings: FocusSettings): Promise<boolean> => {
      const current = timerRef.current;

      if (!current) return false;

      return beginRequest(
        (signal) =>
          updateFocusSettings(
            {
              settings,
              expectedRevision: current.revision,
            },
            signal,
          ),
        true,
      );
    },
    [beginRequest],
  );

  useEffect(() => {
    mountedRef.current = true;

    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    const startedAt = performance.now();

    controllerRef.current = controller;
    lastAttemptRef.current = startedAt;

    function isCurrentInitialRequest() {
      return (
        mountedRef.current &&
        requestIdRef.current === requestId &&
        !controller.signal.aborted
      );
    }

    void getFocusTimer(controller.signal)
      .then((result) => {
        if (!isCurrentInitialRequest()) return;

        acceptTimer(result, startedAt);
        setError("");
      })
      .catch((requestError: unknown) => {
        if (!isCurrentInitialRequest()) return;

        if (requestError instanceof ApiError && requestError.status === 401) {
          onSessionExpired();
          return;
        }

        setError(
          requestError instanceof ApiError
            ? requestError.message
            : "Unable to connect to your timer. Please try again.",
        );
      })
      .finally(() => {
        if (!isCurrentInitialRequest()) return;

        controllerRef.current = null;
        setIsBusy(false);
      });

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    function handleOnline() {
      void refresh();
    }

    const intervalId = window.setInterval(() => {
      const current = timerRef.current;
      const now = performance.now();

      let remaining = clockRef.current.remainingMs;

      if (current?.status === "running") {
        remaining = Math.max(
          0,
          clockRef.current.remainingMs - (now - clockRef.current.receivedAt),
        );

        setRemainingMs(remaining);
      }

      // A completed cycle needs server confirmation even in a background tab.
      const cycleDue = current?.status === "running" && remaining === 0;
      if (
        (!cycleDue && document.visibilityState !== "visible") ||
        !navigator.onLine ||
        controllerRef.current
      ) {
        return;
      }

      const refreshInterval = cycleDue ? 3_000 : 15_000;

      if (now - lastAttemptRef.current >= refreshInterval) {
        void refresh();
      }
    }, 250);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;

      controllerRef.current?.abort();
      controllerRef.current = null;

      window.clearInterval(intervalId);

      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
    };
  }, [acceptTimer, onSessionExpired, refresh]);

  return (
    <FocusContext.Provider
      value={{
        timer,
        remainingMs,
        isBusy,
        error,
        completionEvent,
        refresh,
        sendCommand,
        saveSettings,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}
