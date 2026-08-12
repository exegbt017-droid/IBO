import ptBR from "./locales/pt-BR.json";
import es from "./locales/es.json";

const UI_STRINGS = { "pt-BR": ptBR, es };
const SUPPORTED_LOCALES = ["pt-BR", "es"];
const DEFAULT_LOCALE = "pt-BR";

let currentLocale = localStorage.getItem("curupira_locale") || DEFAULT_LOCALE;
const listeners = new Set();

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale) || locale === currentLocale) return;
  currentLocale = locale;
  localStorage.setItem("curupira_locale", locale);
  listeners.forEach((fn) => fn(locale));
}

export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Traduz uma string da UI (chaves fixas em locales/*.json). */
export function t(key) {
  return UI_STRINGS[currentLocale]?.[key] ?? UI_STRINGS[DEFAULT_LOCALE][key] ?? key;
}

/** Traduz um campo de conteudo bilingue vindo do backend: { "pt-BR": "...", "es": "..." }. */
export function tc(field) {
  if (!field) return "";
  return field[currentLocale] ?? field[DEFAULT_LOCALE] ?? Object.values(field)[0] ?? "";
}
