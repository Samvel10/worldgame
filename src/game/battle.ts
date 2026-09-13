import { answers } from '../data/dictionary';
import { letters, normalizeWord } from './armenian';
import type { Difficulty } from './types';
export const battleLevels: { difficulty: Difficulty; length: number; attempts: number }[] = [
  { difficulty: 'easy', length: 5, attempts: 7 },
  { difficulty: 'medium', length: 7, attempts: 6 },
  { difficulty: 'hard', length: 10, attempts: 5 },
  { difficulty: 'expert', length: 14, attempts: 6 },
];
/** All clients derive the same answer candidate from the server seed without receiving the answer. */
export function answerForSeed(length: number, seed: number): string | null {
  const pool = answers.filter((entry) => letters(entry.word).length === length);
  return pool.length ? pool[seed % pool.length].word : null;
}
export function isBattleGuessCorrect(guess: string, answer: string | null): boolean {
  return answer !== null && normalizeWord(guess) === normalizeWord(answer);
}
export function battleScore(secondsRemaining: number, wrongGuesses: number): number {
  return Math.max(0, 100 + Math.round(secondsRemaining) - wrongGuesses * 25);
}
