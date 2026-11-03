import { apiRequest } from "../../lib/api";

export type FocusMode = "focus" | "shortBreak" | "longBreak";

export type FocusStatus = "idle" | "running" | "paused";

export type FocusSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
};

export type FocusTimer = {
  mode: FocusMode;
  status: FocusStatus;
  cycleId: string | null;

  settings: FocusSettings;

  durationMs: number;
  remainingMs: number;

  startedAt: string | null;
  endsAt: string | null;

  completedFocusCount: number;
  revision: number;

  serverNow: string;
};

export type FocusActionInput =
  | {
      action: "start" | "pause" | "resume" | "reset";
      expectedRevision: number;
    }
  | {
      action: "switchMode";
      expectedRevision: number;
      mode: FocusMode;
    };

export type UpdateFocusSettingsInput = {
  expectedRevision: number;
  settings: FocusSettings;
};

type FocusTimerResponse = {
  data: {
    timer: FocusTimer;
  };
};

export async function getFocusTimer(signal?: AbortSignal): Promise<FocusTimer> {
  const response = await apiRequest<FocusTimerResponse>("/focus", { signal });

  return response.data.timer;
}

export async function performFocusAction(
  input: FocusActionInput,
  signal?: AbortSignal,
): Promise<FocusTimer> {
  const response = await apiRequest<FocusTimerResponse>("/focus/actions", {
    method: "POST",
    json: input,
    signal,
  });

  return response.data.timer;
}

export async function updateFocusSettings(
  input: UpdateFocusSettingsInput,
  signal?: AbortSignal,
): Promise<FocusTimer> {
  const response = await apiRequest<FocusTimerResponse>("/focus/settings", {
    method: "PATCH",
    json: input,
    signal,
  });

  return response.data.timer;
}
