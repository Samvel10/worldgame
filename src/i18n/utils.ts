import { translations } from './translations';
import type { LanguageCode } from './translations';

export function getNestedValue(lang: LanguageCode, path: string): string | undefined {
  const obj = translations[lang];
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}
