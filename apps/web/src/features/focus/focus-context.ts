import { createContext, useContext } from "react";
import type { FocusMode, FocusSettings, FocusTimer } from "./focus-api";

export type FocusCommand =
  | {
      action: "start" | "pause" | "resume" | "reset";
    }
  | {
      action: "switchMode";
      mode: FocusMode;
    };

export type CompletionEvent = {
  cycleId: string;
  mode: FocusMode;
};

export type FocusContextValue = {
  timer: FocusTimer | null;
  remainingMs: number;
  isBusy: boolean;
  error: string;
  completionEvent: CompletionEvent | null;

  refresh: () => Promise<boolean>;
  sendCommand: (command: FocusCommand) => Promise<boolean>;
  saveSettings: (settings: FocusSettings) => Promise<boolean>;
};

export const FocusContext = createContext<FocusContextValue | null>(null);

export function useFocus(): FocusContextValue {
  const context = useContext(FocusContext);

  if (!context) {
    throw new Error("useFocus must be used inside FocusProvider.");
  }

  return context;
}
