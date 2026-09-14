import { expect, it } from 'vitest';
import { scoreGuess, comparePlayers } from '../../shared/battle-rules.mjs';
it('rewards green and yellow discoveries more than the wrong-guess penalty', () => {
  const result = scoreGuess(undefined, ['ա', 'բ', 'գ'], ['correct', 'present', 'absent'], false);
  expect(result.delta).toBe(135);
});
it('does not repeatedly pay for the same discovery or moved yellow', () => {
  const first = scoreGuess(undefined, ['ա', 'բ'], ['present', 'absent'], false);
  expect(first.delta).toBe(35);
  const repeat = scoreGuess(first.progress, ['բ', 'ա'], ['absent', 'present'], false);
  expect(repeat.delta).toBe(-5);
  const green = scoreGuess(repeat.progress, ['ա', 'բ'], ['correct', 'absent'], false);
  expect(green.delta).toBe(55);
});
it('rewards separate repeated-letter occurrences and each green position once', () => {
  const first = scoreGuess(undefined, ['ա', 'ա'], ['correct', 'absent'], false);
  expect(first.delta).toBe(95);
  const second = scoreGuess(first.progress, ['ա', 'ա'], ['correct', 'present'], false);
  expect(second.delta).toBe(35);
  const third = scoreGuess(second.progress, ['ա', 'ա'], ['correct', 'correct'], true);
  expect(third.delta).toBe(1060);
});
it('applies a small penalty to absent guesses and a full solve bonus', () => {
  expect(scoreGuess(undefined, ['ա'], ['absent'], false).delta).toBe(-5);
  expect(scoreGuess(undefined, ['ա'], ['correct'], true).delta).toBe(1100);
});
it('partial points decide zero-solve games before elapsed time', () => {
  expect(
    comparePlayers(
      { solvedCount: 0, score: 135, totalTimeMs: 60000 },
      { solvedCount: 0, score: 35, totalTimeMs: 1000 },
    ),
  ).toBeLessThan(0);
});
