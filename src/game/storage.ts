import type { Settings, Stats, Theme } from './types';
export const storageKeys = {
  stats: 'barrik:stats:v1',
  settings: 'barrik:settings:v1',
  history: 'barrik:history:v1',
  theme: 'barrik:theme:v1',
};
interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function safeRead<T>(
  key: string,
  fallback: T,
  valid: (value: unknown) => value is T,
  storage?: StorageLike,
): T {
  try {
    const raw = (storage ?? window.localStorage).getItem(key);
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
export function safeWrite(key: string, value: unknown, storage?: StorageLike): boolean {
  try {
    (storage ?? window.localStorage).setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function count(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}
export function isStats(value: unknown): value is Stats {
  if (!record(value)) return false;
  const { played, wins, streak, bestStreak, distribution } = value;
  return (
    count(played) &&
    count(wins) &&
    count(streak) &&
    count(bestStreak) &&
    wins <= played &&
    streak <= bestStreak &&
    bestStreak <= wins &&
    record(distribution) &&
    Object.entries(distribution).every(([key, n]) => /^(?:[1-9]|1[0-2])$/.test(key) && count(n)) &&
    Object.values(distribution).reduce<number>((sum, n) => sum + (n as number), 0) === wins
  );
}
export function isSettings(value: unknown): value is Settings {
  return (
    record(value) &&
    ['easy', 'medium', 'hard', 'expert', 'custom'].includes(value.mode as string) &&
    ['all', 'easy', 'medium', 'hard', 'expert'].includes(value.difficulty as string) &&
    Number.isInteger(value.length) &&
    (value.length as number) >= 3 &&
    (value.length as number) <= 40 &&
    Number.isInteger(value.attempts) &&
    (value.attempts as number) >= 3 &&
    (value.attempts as number) <= 12
  );
}
export function isHistory(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 2000 &&
    value.every((word) => typeof word === 'string' && /^[ա-ֆև]{1,80}$/.test(word))
  );
}
export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}
