import { describe, expect, it } from 'vitest';
import { answerForSeed, battleLevels, battleScore, isBattleGuessCorrect } from './battle';
import { letters } from './armenian';
describe('battle protocol helpers', () => {
 it('has four ordered levels', () => expect(battleLevels.map(x=>x.difficulty)).toEqual(['easy','medium','hard','expert']));
 it('derives a real same-length answer from a seed', () => { const word=answerForSeed(5, 42); expect(word).toBeTruthy(); expect(letters(word!)).toHaveLength(5); expect(answerForSeed(5,42)).toBe(word); });
 it('compares normalized words', () => expect(isBattleGuessCorrect('ԱՐԵՒ','արև')).toBe(true));
 it('rewards speed and penalizes wrong guesses', () => expect(battleScore(20,0)).toBeGreaterThan(battleScore(20,2)));
});
