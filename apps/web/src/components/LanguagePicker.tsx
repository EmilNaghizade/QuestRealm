import { languages, useLanguage, setLanguage, t, isLanguage } from "../lib/i18n";
export default function LanguagePicker({ disabled = false }: { disabled?: boolean }) {
  const language = useLanguage();
  return <label className="language-picker">{t("Language")}<select aria-label={t("Language")} value={language} disabled={disabled} onChange={event => { if (isLanguage(event.target.value)) setLanguage(event.target.value); }}>{languages.map(item => <option value={item.id} key={item.id} lang={item.id}>{item.name}</option>)}</select></label>;
}
