import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api";
import { useFocus } from "./focus-context";
import {
  getFocusHistory,
  getFocusStatistics,
  type FocusHistorySession,
  type FocusStatistics,
} from "./focus-stats-api";
import "./focus-stats.css";

function getDateKey(timestamp: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function getDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

type StatsContentProps = {
  onRefresh: () => void;
  onTimeZoneResolved: (timeZone: string) => void;
  checkSession: () => Promise<boolean>;
};

function StatsContent({
  onRefresh,
  onTimeZoneResolved,
  checkSession,
}: StatsContentProps) {
  const [statistics, setStatistics] = useState<FocusStatistics | null>(null);

  const [sessions, setSessions] = useState<FocusHistorySession[]>([]);

  const [historyTimeZone, setHistoryTimeZone] = useState("UTC");

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [statisticsError, setStatisticsError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const pageControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOverview() {
      try {
        const [statsResult, historyResult] = await Promise.allSettled([
          getFocusStatistics(controller.signal),
          getFocusHistory(undefined, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        const unauthorized = [statsResult, historyResult].some(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof ApiError &&
            result.reason.status === 401,
        );

        if (unauthorized) {
          setStatisticsError("Your session has expired.");
          setHistoryError("Your session has expired.");
          void checkSession();
          return;
        }

        if (statsResult.status === "fulfilled") {
          setStatistics(statsResult.value);
        } else {
          setStatisticsError(
            getErrorMessage(
              statsResult.reason,
              "Unable to load your focus statistics.",
            ),
          );
        }

        if (historyResult.status === "fulfilled") {
          setSessions(historyResult.value.data.sessions);
          setHistoryTimeZone(historyResult.value.data.timeZone);
          setNextCursor(historyResult.value.meta.nextCursor);
        } else {
          setHistoryError(
            getErrorMessage(
              historyResult.reason,
              "Unable to load your focus history.",
            ),
          );
        }

        if (statsResult.status === "fulfilled") {
          onTimeZoneResolved(statsResult.value.timeZone);
        } else if (historyResult.status === "fulfilled") {
          onTimeZoneResolved(historyResult.value.data.timeZone);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      controller.abort();
      pageControllerRef.current?.abort();
    };
  }, [checkSession, onTimeZoneResolved]);

  async function loadMore() {
    if (
      !nextCursor ||
      isLoading ||
      isLoadingMore ||
      pageControllerRef.current
    ) {
      return;
    }

    const controller = new AbortController();
    pageControllerRef.current = controller;

    setIsLoadingMore(true);
    setHistoryError("");

    try {
      const response = await getFocusHistory(nextCursor, controller.signal);

      if (controller.signal.aborted) return;

      setSessions((current) => {
        const merged = new Map(current.map((session) => [session.id, session]));

        for (const session of response.data.sessions) {
          merged.set(session.id, session);
        }

        return [...merged.values()];
      });

      setHistoryTimeZone(response.data.timeZone);
      setNextCursor(response.meta.nextCursor);
    } catch (error) {
      if (controller.signal.aborted) return;

      if (error instanceof ApiError && error.status === 401) {
        void checkSession();
        return;
      }

      setHistoryError(
        getErrorMessage(
          error,
          "Unable to load more sessions. Please try again.",
        ),
      );
    } finally {
      if (
        !controller.signal.aborted &&
        pageControllerRef.current === controller
      ) {
        pageControllerRef.current = null;
        setIsLoadingMore(false);
      }
    }
  }

  const numberFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  });

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: historyTimeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const chartMaximum = Math.max(
    30,
    ...(statistics?.days.map((day) => day.minutes) ?? []),
  );

  return (
    <div className="focus-stats-layout">
      <section
        className="card"
        aria-labelledby="focus-stats-title"
        aria-busy={isLoading}
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Small steps add up</p>
            <h2 id="focus-stats-title">Your focus journey</h2>
          </div>

          <button
            className="button button-secondary"
            type="button"
            disabled={isLoading || isLoadingMore}
            onClick={onRefresh}
          >
            {isLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {isLoading && (
          <p className="focus-stats-status muted" role="status">
            Updating your focus statistics…
          </p>
        )}

        {statisticsError && (
          <p className="focus-message focus-error" role="alert">
            {statisticsError}
          </p>
        )}

        {statistics && (
          <>
            <div className="focus-stat-cards">
              <div className="focus-stat-card">
                <span className="focus-stat-label">Today’s focus</span>
                <strong className="focus-stat-number">
                  {numberFormatter.format(statistics.today.minutes)}
                  <small>min</small>
                </strong>
              </div>

              <div className="focus-stat-card">
                <span className="focus-stat-label">Sessions today</span>
                <strong className="focus-stat-number">
                  {numberFormatter.format(statistics.today.sessions)}
                </strong>
              </div>

              <div className="focus-stat-card">
                <span className="focus-stat-label">Last 7 days</span>
                <strong className="focus-stat-number">
                  {numberFormatter.format(statistics.week.minutes)}
                  <small>min</small>
                </strong>
              </div>
            </div>

            <div className="focus-chart-heading">
              <h3>Your last 7 days</h3>
              <span className="muted">Completed focus minutes</span>
            </div>

            <ol
              className="focus-week-chart"
              aria-label="Daily completed focus minutes"
            >
              {statistics.days.map((day) => {
                const isToday = day.date === statistics.today.date;

                const height = (day.minutes / chartMaximum) * 100;

                return (
                  <li
                    className={`focus-week-day ${
                      isToday ? "focus-week-day-today" : ""
                    }`}
                    key={day.date}
                    aria-label={`${day.date}: ${day.minutes} minutes, ${day.sessions} sessions`}
                  >
                    <span className="focus-week-value" aria-hidden="true">
                      {numberFormatter.format(day.minutes)}
                    </span>

                    <div className="focus-week-track" aria-hidden="true">
                      <div
                        className="focus-week-bar"
                        style={{
                          height: `${height}%`,
                        }}
                      />
                    </div>

                    <span className="focus-week-label" aria-hidden="true">
                      {getDayLabel(day.date)}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="section-footnote">
              Dates follow your account time zone: {statistics.timeZone}.
              Sessions count toward the day they finish. Breaks are not
              included.
            </p>
          </>
        )}
      </section>

      <section
        className="card"
        aria-labelledby="focus-history-title"
        aria-busy={isLoading || isLoadingMore}
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">A record of your progress</p>
            <h2 id="focus-history-title">Session history</h2>
          </div>
        </div>

        {historyError && (
          <p className="focus-message focus-error" role="alert">
            {historyError}
          </p>
        )}

        {isLoading && (
          <p className="focus-stats-status muted" role="status">
            Updating your session history…
          </p>
        )}

        {!isLoading && !historyError && sessions.length === 0 && (
          <div className="focus-history-empty">
            <span aria-hidden="true">◷</span>
            <h3>Your first session is waiting.</h3>
            <p className="muted">
              Complete a focus session to begin your history.
            </p>
          </div>
        )}

        <ul className="focus-history-list">
          {sessions.map((session) => (
            <li className="focus-history-item" key={session.id}>
              <span className="focus-history-icon" aria-hidden="true">
                ✓
              </span>

              <div className="focus-history-copy">
                <h3>Focus completed</h3>

                <time dateTime={session.completedAt}>
                  {dateFormatter.format(new Date(session.completedAt))}
                </time>
              </div>

              <span className="focus-history-duration">
                {numberFormatter.format(session.durationMinutes)} min
              </span>
            </li>
          ))}
        </ul>

        {nextCursor && (
          <div className="focus-history-pagination">
            <button
              className="button button-secondary"
              type="button"
              disabled={isLoading || isLoadingMore}
              onClick={() => void loadMore()}
            >
              {isLoadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}

        {historyError && !nextCursor && !isLoading && (
          <div className="focus-history-pagination">
            <button
              className="button button-secondary"
              type="button"
              onClick={onRefresh}
            >
              Try again
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function FocusStatsPanel() {
  const { timer, refresh } = useFocus();

  const [reloadCount, setReloadCount] = useState(0);

  // Only an initial refresh trigger. Displayed statistics
  // always use the time zone returned by the server.
  const [timeZone, setTimeZone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  if (!timer) return null;

  const localDate = getDateKey(timer.serverNow, timeZone);

  const contentKey = [
    timer.completedFocusCount,
    timeZone,
    localDate,
    reloadCount,
  ].join(":");

  return (
    <StatsContent
      key={contentKey}
      checkSession={refresh}
      onTimeZoneResolved={setTimeZone}
      onRefresh={() => setReloadCount((current) => current + 1)}
    />
  );
}
