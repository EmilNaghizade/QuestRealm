import { createContext, useContext } from "react";

export type SoundSettings = {
  enabled: boolean;
  volume: number;
};

export type SoundContextValue = SoundSettings & {
  isReady: boolean;
  error: string;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  preview: () => Promise<void>;
};

export const SoundContext = createContext<SoundContextValue | null>(null);

export function useFocusSound(): SoundContextValue {
  const context = useContext(SoundContext);

  if (!context) {
    throw new Error("useFocusSound must be used inside FocusSoundProvider.");
  }

  return context;
}
