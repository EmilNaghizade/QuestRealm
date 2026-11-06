import { useState, type FormEvent } from "react";
import { updateProfile, type AuthUser } from "../auth/auth-api";
import { ApiError } from "../../lib/api";
import { t, useLanguage } from "../../lib/i18n";
import LanguagePicker from "../../components/LanguagePicker";
export default function AccountPage({ section, user, theme, onThemeChanged, onProfileChanged, onSessionExpired }: { section: "profile" | "settings"; user: AuthUser; theme: "light" | "dark"; onThemeChanged: (theme: "light" | "dark") => void; onProfileChanged: (user: AuthUser) => void; onSessionExpired: () => void }) {
  const language = useLanguage();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [timeZone, setTimeZone] = useState(user.timeZone);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const profile = section === "profile";
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await updateProfile({ displayName: profile ? displayName.trim() : user.displayName, timeZone: profile ? timeZone.trim() : user.timeZone, language });
      onProfileChanged(result);
      setNotice(profile ? "Profile saved." : "Preferences saved.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) { onSessionExpired(); return; }
      setError(error instanceof ApiError ? error.message : "Unable to save your profile. Please try again.");
    } finally { setBusy(false); }
  }
  return <form className="account-page" onSubmit={save} aria-busy={busy}>
    <fieldset className="account-fields" disabled={busy}><legend className="auth-sr-only">{t(profile ? "Profile" : "Settings")}</legend>
      {profile ? <>
        <div className="account-field"><label htmlFor="profile-name">{t("Display name")}</label><input id="profile-name" autoComplete="nickname" minLength={2} maxLength={40} required value={displayName} onChange={event => setDisplayName(event.target.value)}/></div>
        <div className="account-field"><label htmlFor="profile-email">{t("Email address")}</label><input id="profile-email" type="email" readOnly value={user.email} aria-describedby="email-help"/><p id="email-help" className="muted">{t("Email cannot be changed here.")}</p></div>
        <div className="account-field"><label htmlFor="profile-timezone">{t("Time zone")}</label><input id="profile-timezone" required maxLength={100} value={timeZone} placeholder="Asia/Baku" onChange={event => setTimeZone(event.target.value)} list="account-timezones" aria-describedby="timezone-help"/><datalist id="account-timezones">{[...new Set([user.timeZone, Intl.DateTimeFormat().resolvedOptions().timeZone, "UTC", "Asia/Baku", "Europe/Istanbul", "Europe/Moscow", "Europe/London", "America/New_York"])].map(zone => <option key={zone} value={zone}/>)}</datalist><p id="timezone-help" className="muted">{t("Daily quests follow your account time zone.")}</p></div>
      </> : <>
        <section className="account-field"><h2>{t("Language")}</h2><p className="muted">{t("Choose the language of your adventure.")}</p><LanguagePicker disabled={busy}/><p className="muted">{t("Language is saved on this device immediately. Save preferences to use it on other devices.")}</p></section>
        <section className="account-field"><h2>{t("Appearance")}</h2><div className="theme-options" role="group" aria-label={t("Appearance")}>{(["light","dark"] as const).map(value => <button className="button button-secondary" type="button" key={value} aria-pressed={theme === value} onClick={() => onThemeChanged(value)}>{t(value === "light" ? "Light theme" : "Dark theme")}</button>)}</div></section>
      </>}
      <button className="button button-primary account-save" type="submit">{t(busy ? "Saving…" : profile ? "Save profile" : "Save preferences")}</button>
    </fieldset><p className="task-notice" role="status">{t(notice)}</p>{error && <p className="task-error" role="alert">{t(error)}</p>}
  </form>;
}
