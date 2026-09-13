import { answers, acceptedWords } from '../data/dictionary';
import { isArmenian, letters, normalizeWord } from './armenian';
import type { Answer, Difficulty, KeyboardState, Mark, Mode, Stats, Status } from './types';
export { isArmenian, letters, normalizeWord } from './armenian';
export const levels: Record<Mode, { label: string; description: string; attempts: number }> = {
  easy: { label: 'Հեշտ', description: '3–5 տառ · 7 փորձ · մեկ ակնարկ', attempts: 7 },
  medium: { label: 'Միջին', description: '6–8 տառ · 6 փորձ', attempts: 6 },
  hard: { label: 'Բարդ', description: '9–12 տառ · 5 փորձ', attempts: 5 },
  expert: { label: 'Փորձագետ', description: '13 և ավելի տառ · 6–9 փորձ', attempts: 6 },
  custom: { label: 'Անհատական', description: 'Քո կանոններով', attempts: 6 },
};
export function validateGuess(word: string, length: number): string | null {
  if (!isArmenian(word)) return 'Մուտքագրիր միայն հայերեն տառեր';
  if (letters(word).length !== length) return `Բառը պետք է ունենա ${length} տառ`;
  if (!acceptedWords.has(normalizeWord(word))) return 'Այս բառը բառարանում չկա';
  return null;
}
export function countLetters(chars: string[]): Record<string, number> {
  return chars.reduce<Record<string, number>>((counts, char) => {
    counts[char] = (counts[char] ?? 0) + 1;
    return counts;
  }, {});
}
export function evaluateGuess(guess: string, answer: string): Mark[] {
  const a = letters(answer),
    g = letters(guess);
  const marks: Mark[] = g.map((char, i) => (char === a[i] ? 'correct' : 'absent'));
  const remaining = countLetters(a.filter((_, i) => marks[i] !== 'correct'));
  g.forEach((char, i) => {
    if (marks[i] !== 'correct' && remaining[char] > 0) {
      marks[i] = 'present';
      remaining[char]--;
    }
  });
  return marks;
}
const ranks: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };
export function mergeKeyboard(
  previous: KeyboardState,
  guess: string,
  marks: Mark[],
): KeyboardState {
  const next = { ...previous };
  letters(guess).forEach((char, i) => {
    if (next[char] === undefined || ranks[marks[i]] > ranks[next[char]]) next[char] = marks[i];
  });
  return next;
}
export function filterAnswers(difficulty: Difficulty | 'all', length?: number): Answer[] {
  return answers.filter(
    (answer) =>
      (difficulty === 'all' || answer.difficulty === difficulty) &&
      (length === undefined || letters(answer.word).length === length),
  );
}
export function randomFraction(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
export function chooseWord(
  pool: Answer[],
  history: string[],
  random = randomFraction,
): { answer: Answer; history: string[] } | null {
  if (!pool.length) return null;
  let recent = history;
  let available = pool.filter((answer) => !recent.includes(answer.word));
  if (!available.length) {
    const poolWords = new Set(pool.map((answer) => answer.word));
    const lastWord = history.at(-1);
    recent = history.filter((word) => !poolWords.has(word));
    if (lastWord && poolWords.has(lastWord)) recent.push(lastWord);
    available = pool.filter((answer) => !recent.includes(answer.word));
  }
  if (!available.length) available = pool;
  const answer =
    available[Math.min(available.length - 1, Math.max(0, Math.floor(random() * available.length)))];
  console.log(`Chosen word: ${answer.word} (${answer.difficulty})`);
  return {
    answer,
    history: [...recent.filter((word) => word !== answer.word), answer.word].slice(-2000),
  };
}
export function attemptsFor(mode: Mode, length: number, custom: number): number {
  return mode === 'custom'
    ? custom
    : mode === 'expert'
      ? Math.min(9, Math.max(6, Math.ceil(length / 3)))
      : levels[mode].attempts;
}
export function gameStatus(answer: string, guesses: string[], limit: number): Status {
  if (guesses.some((guess) => normalizeWord(guess) === normalizeWord(answer))) return 'won';
  return guesses.length >= limit ? 'lost' : 'playing';
}
export function emptyStats(): Stats {
  return { played: 0, wins: 0, streak: 0, bestStreak: 0, distribution: {} };
}
export function updateStats(stats: Stats, won: boolean, attempts: number): Stats {
  const streak = won ? stats.streak + 1 : 0;
  return {
    played: stats.played + 1,
    wins: stats.wins + Number(won),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    distribution: won
      ? { ...stats.distribution, [attempts]: (stats.distribution[attempts] ?? 0) + 1 }
      : { ...stats.distribution },
  };
}
