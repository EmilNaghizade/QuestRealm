import { useSyncExternalStore } from "react";
import { messages } from "./messages";
export const languages = [{ id: "en", name: "English" }, { id: "az", name: "Azərbaycanca" }, { id: "tr", name: "Türkçe" }, { id: "ru", name: "Русский" }] as const;
export type Language = typeof languages[number]["id"];
export function isLanguage(value: unknown): value is Language { return languages.some(language => language.id === value); }
function initialLanguage(): Language {
  try { const saved = localStorage.getItem("questrealm.language"); if (isLanguage(saved)) return saved; } catch { /* Storage is optional. */ }
  return "en";
}
let language: Language = initialLanguage();
const listeners = new Set<() => void>();
export function getLanguage() { return language; }
export function setLanguage(value: Language) {
  if (!isLanguage(value)) return;
  language = value;
  document.documentElement.lang = value;
  try { localStorage.setItem("questrealm.language",value); } catch { /* Language works without storage. */ }
  listeners.forEach(listener => listener());
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function useLanguage() { return useSyncExternalStore(subscribe,getLanguage,() => "en" as Language); }
export function locale() { return { en: "en-US", az: "az-AZ", tr: "tr-TR", ru: "ru-RU" }[language]; }
const patterns = Object.keys(messages).filter(key => /\{\d+\}/.test(key)).sort((a,b) => b.replace(/\{\d+\}/g,"").length-a.replace(/\{\d+\}/g,"").length).map(key => {
  const source = key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? "(.+?)" : part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("");
  return { key, expression: new RegExp(`^${source}$`) };
});
export function t(source: string | null | undefined, values?: Record<number, string | number>): string {
  if (!source) return "";
  const index = { en: -1, az: 0, tr: 1, ru: 2 }[language];
  let text = index < 0 ? source : messages[source]?.[index] ?? source;
  let params = values;
  if (index >= 0 && text === source && !messages[source]) {
    const found = patterns.find(pattern => pattern.expression.test(source));
    if (found) {
      const match = source.match(found.expression)!;
      text = messages[found.key]![index]!;
      const slots = [...found.key.matchAll(/\{(\d+)\}/g)];
      params = Object.fromEntries(slots.map((slot,i) => [Number(slot[1]),match[i+1]!]));
    }
  }
  return text.replace(/\{(\d+)\}/g,(placeholder,key) => String(params?.[Number(key)] ?? placeholder));
}
