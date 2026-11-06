import BrandLogo from "../../components/BrandLogo";
import { useState, type FormEvent } from "react";
import { ApiError } from "../../lib/api";
import { login, register, type AuthUser } from "./auth-api";
import "./auth.css";

type AuthScreenProps = {
  onAuthenticated: (user: AuthUser) => void;
};

export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const credentials = {
        email: email.trim(),
        password,
      };

      const user = isRegister
        ? await register({
            ...credentials,
            displayName: displayName.trim(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          })
        : await login(credentials);

      setPassword("");
      onAuthenticated(user);
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode() {
    setMode((current) => (current === "login" ? "register" : "login"));

    setError("");
    setPassword("");
  }

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <div className="brand"><BrandLogo/></div>

          <div className="auth-story-copy">
            <span className="eyebrow">Your adventure awaits</span>

            <h1 id="auth-story-title">
              A little progress,
              <br />
              every day.
            </h1>

            <p className="muted">
              Complete meaningful quests, make room for focus, and turn everyday
              progress into your own adventure.
            </p>
          </div>

          <p className="auth-story-footer">
            Every great kingdom starts with one small step.
          </p>
        </section>

        <section
          className="card auth-form-card"
          aria-labelledby="auth-form-title"
        >
          <span className="badge">
            {isRegister ? "A fresh beginning" : "Your next chapter"}
          </span>

          <h2 id="auth-form-title">
            {isRegister ? "Begin your adventure." : "Welcome back."}
          </h2>

          <p className="muted auth-form-description">
            {isRegister
              ? "Create your account and start building your realm."
              : "Your quests are waiting. Let’s make today count."}
          </p>

          <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <fieldset className="auth-fields" disabled={isSubmitting}>
              <legend className="auth-sr-only">
                {isRegister ? "Create an account" : "Sign in"}
              </legend>

              {isRegister && (
                <div className="auth-field">
                  <label htmlFor="displayName">Adventurer name</label>

                  <input
                    id="displayName"
                    name="displayName"
                    autoComplete="nickname"
                    placeholder="What should we call you?"
                    minLength={2}
                    maxLength={40}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className="auth-field">
                <label htmlFor="email">Email address</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Password</label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  placeholder={
                    isRegister ? "At least 6 characters" : "Your password"
                  }
                  minLength={6}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-describedby={error ? "auth-error" : undefined}
                  required
                />
              </div>

              {error && (
                <p className="auth-error" id="auth-error" role="alert">
                  {error}
                </p>
              )}

              <button
                className="button button-primary auth-submit"
                type="submit"
              >
                {isSubmitting
                  ? "Please wait…"
                  : isRegister
                    ? "Create account"
                    : "Sign in"}
              </button>
            </fieldset>
          </form>

          <p className="auth-switch">
            {isRegister ? "Already an adventurer?" : "New to QuestRealm?"}

            <button
              className="auth-text-button"
              type="button"
              disabled={isSubmitting}
              onClick={switchMode}
            >
              {isRegister ? "Sign in" : "Create an account"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
