import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api";
import {
  getCharacters,
  selectCharacter,
  type Character,
} from "./character-api";
import "./character.css";

type ChooseCharacterProps = {
  onSelected: (characterId: string) => void;
  onSessionExpired: () => void;
};

export default function ChooseCharacter({
  onSelected,
  onSessionExpired,
}: ChooseCharacterProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCharacters() {
      try {
        const result = await getCharacters(controller.signal);

        if (!controller.signal.aborted) {
          setCharacters(result);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          onSessionExpired();
          return;
        }

        setError(
          error instanceof ApiError
            ? error.message
            : "Unable to load characters. Please try again.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCharacters();

    return () => controller.abort();
  }, [retryCount, onSessionExpired]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedId || isSaving) {
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const characterId = await selectCharacter(selectedId);
      onSelected(characterId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onSessionExpired();
        return;
      }

      setError(
        error instanceof ApiError
          ? error.message
          : "Unable to save your character. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="session-screen">
        <p role="status">Gathering your adventurers…</p>
      </main>
    );
  }

  if (characters.length === 0) {
    return (
      <main className="session-screen">
        <div className="card session-panel">
          <h1>Let’s try again.</h1>
          <p className="muted" role="alert">
            {error || "No characters are available right now."}
          </p>

          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              setError("");
              setIsLoading(true);
              setRetryCount((current) => current + 1);
            }}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="character-page">
      <header className="character-page-header">
        <a className="character-brand" href="#dashboard">QuestRealm</a>
        <h1>Choose your character.</h1>
        <p className="muted">
          A companion for your everyday progress.
        </p>
      </header>

      <form onSubmit={handleSubmit} aria-busy={isSaving}>
        <fieldset className="character-options" disabled={isSaving}>
          <legend className="auth-sr-only">Choose one character</legend>

          {characters.map((character) => (
            <label
              className={`character-option ${
                selectedId === character.id ? "character-option-selected" : ""
              }`}
              key={character.id}
            >
              <input
                type="radio"
                name="character"
                value={character.id}
                checked={selectedId === character.id}
                onChange={() => setSelectedId(character.id)}
                required
              />



              <span className="character-option-name">{character.name}</span>

              <span className="character-role">{character.role}</span>

              <span className="character-description">
                {character.description}
              </span>
            </label>
          ))}
        </fieldset>

        <div className="character-confirm">
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <p className="muted">
            All adventurers start equally. This choice sets your identity, not
            your rewards. Character changes are not available yet.
          </p>

          <button
            className="button button-primary"
            type="submit"
            disabled={!selectedId || isSaving}
          >
            {isSaving ? "Preparing your journey…" : "Begin my adventure"}
          </button>
        </div>
      </form>
    </main>
  );
}
