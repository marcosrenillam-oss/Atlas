import { es, type MessageKey } from './es';

type Dict = Record<MessageKey, string>;
const dictionaries: Record<string, Dict> = { es };
let current: Dict = es;

export const LANGUAGES = [{ code: 'es', label: 'Español' }] as const;

export function setLanguage(code: string) {
  current = dictionaries[code] ?? es;
  document.documentElement.lang = code;
}

/** Traduce una clave; admite {variables}. */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  let s = current[key] ?? es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}
