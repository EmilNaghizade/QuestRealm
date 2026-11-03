import { apiRequest } from "../../lib/api";

export type FocusDaySummary = {
  date: string;
  minutes: number;
  sessions: number;
};

export type FocusStatistics = {
  timeZone: string;

  today: FocusDaySummary;

  week: {
    minutes: number;
    sessions: number;
  };

  days: FocusDaySummary[];
};

export type FocusHistorySession = {
  id: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
};

export type FocusHistoryResponse = {
  data: {
    timeZone: string;
    sessions: FocusHistorySession[];
  };

  meta: {
    nextCursor: string | null;
  };
};

type FocusStatisticsResponse = {
  data: FocusStatistics;
};

export async function getFocusStatistics(
  signal?: AbortSignal,
): Promise<FocusStatistics> {
  const response = await apiRequest<FocusStatisticsResponse>("/focus/stats", {
    signal,
  });

  return response.data;
}

export function getFocusHistory(
  cursor?: string,
  signal?: AbortSignal,
): Promise<FocusHistoryResponse> {
  const params = new URLSearchParams();

  if (cursor) {
    params.set("cursor", cursor);
  }

  const query = params.toString();

  return apiRequest<FocusHistoryResponse>(
    `/focus/history${query ? `?${query}` : ""}`,
    { signal },
  );
}
