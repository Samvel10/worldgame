import { describe, it, expect } from 'vitest';
import {
  comparePlayers,
  roundDuration,
  elapsedRound,
  formatTime,
} from '../../shared/battle-rules.mjs';
describe('Battle time rules', () => {
  it('accepts host durations including unlimited and rejects invalid input', () => {
    expect(roundDuration(0)).toBe(0);
    expect(roundDuration(17)).toBe(17000);
    expect(roundDuration(undefined)).toBe(90000);
    for (const n of [-1, 0.5, 3601, '30', null, NaN, Infinity])
      expect(() => roundDuration(n)).toThrow();
  });
  it('clamps timed rounds and counts unlimited elapsed time', () => {
    expect(elapsedRound(1000, 3000, 9000)).toBe(2000);
    expect(elapsedRound(1000, null, 9000)).toBe(8000);
    expect(elapsedRound(1000, null, 900)).toBe(0);
  });
  it('prioritizes solved words, then points, then less total time', () => {
    const a = { solvedCount: 2, totalTimeMs: 60000, score: 2000 };
    expect(comparePlayers(a, { solvedCount: 1, totalTimeMs: 1, score: 5000 })).toBeLessThan(0);
    expect(comparePlayers(a, { ...a, totalTimeMs: 70000, score: 2000 })).toBeLessThan(0);
    expect(comparePlayers(a, { ...a, score: 1900 })).toBeLessThan(0);
    expect(comparePlayers(a, { ...a })).toBe(0);
  });
  it('formats total time without wrapping after an hour', () => {
    expect(formatTime(61000)).toBe('1:01.0');
    expect(formatTime(3600000)).toBe('60:00.0');
  });
});
