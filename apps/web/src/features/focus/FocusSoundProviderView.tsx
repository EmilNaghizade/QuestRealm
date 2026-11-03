import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFocus } from "./FocusProvider";
import { SoundContext, type SoundSettings } from "./focus-sound-context";

const STORAGE_KEY = "questrealm.focus.sound";

function getInitialSettings(): SoundSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SoundSettings>;

      return {
        enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true,
        volume:
          typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
            ? Math.max(0, Math.min(1, parsed.volume))
            : 0.5,
      };
    }
  } catch {
    // Sound works without persistent storage.
  }

  return {
    enabled: true,
    volume: 0.5,
  };
}

export default function FocusSoundProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { completionEvent } = useFocus();

  const [settings, setSettings] = useState<SoundSettings>(getInitialSettings);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");

  const audioRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef(new Set<OscillatorNode>());
  const lastEventRef = useRef<string | null>(null);

  const settingsRef = useRef(settings);

  const stopMelody = useCallback(() => {
    for (const oscillator of oscillatorsRef.current) {
      try {
        oscillator.stop();
      } catch {
        // The oscillator may already have finished.
      }
    }

    oscillatorsRef.current.clear();
  }, []);

  const unlockAudio = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.AudioContext) {
        setError("Your browser does not support timer sounds.");
        return false;
      }

      let audio = audioRef.current;

      if (!audio || audio.state === "closed") {
        audio = new AudioContext();

        const masterGain = audio.createGain();
        masterGain.gain.value = settingsRef.current.enabled
          ? settingsRef.current.volume
          : 0;

        masterGain.connect(audio.destination);

        audioRef.current = audio;
        masterGainRef.current = masterGain;

        const currentAudio = audio;

        audio.onstatechange = () => {
          if (audioRef.current === currentAudio) {
            setIsReady(currentAudio.state === "running");
          }
        };
      }

      if (audio.state !== "running") {
        await audio.resume();
      }

      if (audioRef.current !== audio) return false;

      const ready = audio.state === "running";

      setIsReady(ready);

      if (ready) {
        setError("");
      } else {
        setError("Tap Preview sound to enable audio in this browser.");
      }

      return ready;
    } catch {
      setIsReady(false);
      setError("Audio could not start. Tap Preview sound to try again.");

      return false;
    }
  }, []);

  const playMelody = useCallback(() => {
    const audio = audioRef.current;
    const masterGain = masterGainRef.current;

    if (
      !settingsRef.current.enabled ||
      !audio ||
      !masterGain ||
      audio.state !== "running"
    ) {
      return;
    }

    stopMelody();

    const notes = [
      { frequency: 523.25, offset: 0, duration: 0.22 },
      { frequency: 659.25, offset: 0.26, duration: 0.22 },
      { frequency: 783.99, offset: 0.52, duration: 0.22 },
      { frequency: 1046.5, offset: 0.8, duration: 0.65 },
    ];

    const startsAt = audio.currentTime + 0.03;

    for (const note of notes) {
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();

      const noteStart = startsAt + note.offset;
      const noteEnd = noteStart + note.duration;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, noteStart);

      envelope.gain.setValueAtTime(0.0001, noteStart);
      envelope.gain.exponentialRampToValueAtTime(0.2, noteStart + 0.02);
      envelope.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

      oscillator.connect(envelope);
      envelope.connect(masterGain);

      oscillatorsRef.current.add(oscillator);

      oscillator.onended = () => {
        oscillatorsRef.current.delete(oscillator);
        oscillator.disconnect();
        envelope.disconnect();
      };

      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.03);
    }
  }, [stopMelody]);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      const next = {
        ...settingsRef.current,
        enabled,
      };

      settingsRef.current = next;
      setSettings(next);

      const audio = audioRef.current;
      const gain = masterGainRef.current;

      if (audio && gain) {
        gain.gain.setValueAtTime(enabled ? next.volume : 0, audio.currentTime);
      }

      if (enabled) {
        void unlockAudio();
      } else {
        stopMelody();
        setError("");
      }
    },
    [stopMelody, unlockAudio],
  );

  const setVolume = useCallback((volume: number) => {
    if (!Number.isFinite(volume)) return;

    const next = {
      ...settingsRef.current,
      volume: Math.max(0, Math.min(1, volume)),
    };

    settingsRef.current = next;
    setSettings(next);

    const audio = audioRef.current;
    const gain = masterGainRef.current;

    if (audio && gain) {
      gain.gain.setValueAtTime(
        next.enabled ? next.volume : 0,
        audio.currentTime,
      );
    }
  }, []);

  const preview = useCallback(async () => {
    if (!settingsRef.current.enabled) return;

    const ready = await unlockAudio();

    if (ready) {
      playMelody();
    }
  }, [playMelody, unlockAudio]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Preferences still work for this visit.
    }
  }, [settings]);

  useEffect(() => {
    if (!settings.enabled) return;

    function handleInteraction() {
      void unlockAudio();
    }

    window.addEventListener("pointerdown", handleInteraction);
    window.addEventListener("keydown", handleInteraction);

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [settings.enabled, unlockAudio]);

  useEffect(() => {
    if (!completionEvent || lastEventRef.current === completionEvent.cycleId) {
      return;
    }

    lastEventRef.current = completionEvent.cycleId;

    if (!settingsRef.current.enabled) return;

    if (audioRef.current?.state === "running") {
      playMelody();
    } else {
      setError("A session ended. Tap Preview sound to enable future alerts.");
    }
  }, [completionEvent, playMelody]);

  useEffect(() => {
    return () => {
      stopMelody();

      const audio = audioRef.current;

      audioRef.current = null;
      masterGainRef.current = null;

      if (audio) {
        audio.onstatechange = null;
        void audio.close().catch(() => {});
      }
    };
  }, [stopMelody]);

  return (
    <SoundContext.Provider
      value={{
        ...settings,
        isReady,
        error,
        setEnabled,
        setVolume,
        preview,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}
