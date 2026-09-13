import { deleteBackward } from './armenian';
import { describe, expect, it } from 'vitest';
import {
  normalizeWord,
  letters,
  isArmenian,
  validateGuess,
  evaluateGuess,
  countLetters,
  mergeKeyboard,
  filterAnswers,
  chooseWord,
  gameStatus,
  updateStats,
  emptyStats,
} from './engine';
import { safeRead, safeWrite, isStats, isSettings, isHistory } from './storage';
import rawAccepted from '../data/accepted.json';
import { initializeDictionary, answers, acceptedWords } from '../data/dictionary';

initializeDictionary(rawAccepted);

describe('Armenian orthography and validation', () => {
  it('normalizes NFC, case and և consistently', () => {
    expect(normalizeWord('ԱՐԵՒ')).toBe('արև');
    expect(normalizeWord('ԱՐԵՎ')).toBe('արև');
    expect(normalizeWord('արև')).toBe('արև');
  });
  it('treats ու and և as individual tiles', () => {
    expect(letters('Ուղևոր')).toEqual(['ու', 'ղ', 'և', 'ո', 'ր']);
  });
  it.each(['abc', 'արա1', 'բառ ', ' բառ', 'բ-առ', 'բա՛ռ', 'ա\u0301', '🙂', ''])(
    'rejects non Armenian input %s',
    (value) => expect(isArmenian(value)).toBe(false),
  );
  it('accepts uppercase Armenian', () => expect(isArmenian('ԲԱՌ')).toBe(true));
  it('rejects invented words', () =>
    expect(validateGuess('ժժժ', 3)).toBe('Այս բառը բառարանում չկա'));
  it('rejects wrong lengths', () => expect(validateGuess('արև', 5)).toContain('5'));
  it('accepts a real word', () => expect(validateGuess('ԱՐԵՒ', 3)).toBeNull());
});
describe('two pass scoring', () => {
  it('marks all correct', () =>
    expect(evaluateGuess('անուն', 'անուն')).toEqual(['correct', 'correct', 'correct', 'correct']));
  it('marks present and absent letters', () =>
    expect(evaluateGuess('սար', 'արև')).toEqual(['absent', 'present', 'present']));
  it('reserves exact matches before yellow', () =>
    expect(evaluateGuess('աաբ', 'աբգ')).toEqual(['correct', 'absent', 'present']));
  it('does not allocate a letter twice', () =>
    expect(evaluateGuess('աաբ', 'գբա')).toEqual(['present', 'absent', 'present']));
  it('allows two matches when answer has two copies', () =>
    expect(evaluateGuess('բաա', 'աաբ')).toEqual(['present', 'correct', 'present']));
  it('counts remaining letters', () =>
    expect(countLetters(['ա', 'ա', 'բ'])).toEqual({ ա: 2, բ: 1 }));
  it('never downgrades keyboard states', () =>
    expect(
      mergeKeyboard({ ա: 'correct', բ: 'present' }, 'աբգ', ['absent', 'absent', 'present']),
    ).toEqual({ ա: 'correct', բ: 'present', գ: 'present' }));
});
describe('dictionary and selection', () => {
  it('has a substantial sourced local dictionary', () => {
    expect(acceptedWords.size).toBeGreaterThan(10000);
    expect(answers.length).toBeGreaterThan(180);
  });
  it('all curated answers are accepted, unique, canonical', () => {
    expect(new Set(answers.map((x) => x.word)).size).toBe(answers.length);
    for (const x of answers) {
      expect(acceptedWords.has(x.word)).toBe(true);
      expect(isArmenian(x.word)).toBe(true);
      expect(normalizeWord(x.word)).toBe(x.word);
    }
  });
  it.each(['easy', 'medium', 'hard', 'expert'] as const)('filters %s accurately', (level) => {
    const pool = filterAnswers(level);
    expect(pool.length).toBeGreaterThan(5);
    expect(pool.every((x) => x.difficulty === level)).toBe(true);
  });
  it('filters exact lengths', () => {
    for (const length of [3, 5, 8, 12, 20]) {
      const pool = filterAnswers('all', length);
      expect(pool.length).toBeGreaterThan(0);
      expect(pool.every((x) => letters(x.word).length === length)).toBe(true);
    }
  });
  it('handles missing pools', () => expect(chooseWord([], [])).toBeNull());
  it('avoids history and immediate repetition at reset', () => {
    const pool = answers.slice(0, 3);
    const result = chooseWord(pool, [pool[0].word, pool[1].word], () => 0)!;
    expect(result.answer.word).toBe(pool[2].word);
    const reset = chooseWord(
      pool,
      pool.map((x) => x.word),
      () => 0.999,
    )!;
    expect(reset.answer.word).not.toBe(pool[2].word);
  });
});
describe('completion and stats', () => {
  it('wins on last attempt', () => expect(gameStatus('արև', ['սար', 'արև'], 2)).toBe('won'));
  it('loses on exhaustion', () => expect(gameStatus('արև', ['սար', 'բառ'], 2)).toBe('lost'));
  it('continues with attempts remaining', () =>
    expect(gameStatus('արև', ['սար'], 2)).toBe('playing'));
  it('updates wins, streak, distribution and percent', () => {
    const s = updateStats(emptyStats(), true, 3);
    expect(s).toEqual({ played: 1, wins: 1, streak: 1, bestStreak: 1, distribution: { 3: 1 } });
    const lost = updateStats(s, false, 6);
    expect(lost).toEqual({ ...s, played: 2, streak: 0 });
  });
});
describe('safe local storage', () => {
  const storage = (value: string | null) => ({ getItem: () => value, setItem: () => {} });
  it.each([
    '{',
    'null',
    '[]',
    '{"played":-1}',
    '{"played":1,"wins":9,"streak":0,"bestStreak":0,"distribution":{}}',
  ])('recovers from invalid stats %s', (value) =>
    expect(safeRead('stats', emptyStats(), isStats, storage(value))).toEqual(emptyStats()),
  );
  it('reads valid data', () => {
    const s = emptyStats();
    expect(safeRead('stats', s, isStats, storage(JSON.stringify(s)))).toEqual(s);
  });
  it('survives denied reads and writes', () => {
    const denied = {
      getItem: () => {
        throw Error('denied');
      },
      setItem: () => {
        throw Error('quota');
      },
    };
    expect(safeRead('x', [], isHistory, denied)).toEqual([]);
    expect(safeWrite('x', {}, denied)).toBe(false);
  });
  it('validates settings and history deeply', () => {
    expect(isSettings({ mode: 'evil', length: 5, attempts: 6, difficulty: 'all' })).toBe(false);
    expect(isHistory([2])).toBe(false);
  });
});

describe('dictionary loading contract', () => {
  it('rejects corrupt dictionaries without replacing the usable list', async () => {
    const { initializeDictionary } = await import('../data/dictionary');
    expect(() => initializeDictionary(['արև', 'abc'])).toThrow('Invalid dictionary data');
    expect(acceptedWords.has('արև')).toBe(true);
  });
});

describe('independent answer-pool history', () => {
  it('retains other pools when the current pool is exhausted', () => {
    const pool = answers.slice(0, 2);
    const outside = answers[4].word;
    const result = chooseWord(pool, [outside, pool[0].word, pool[1].word], () => 0)!;
    expect(result.history).toContain(outside);
    expect(result.answer.word).not.toBe(pool[1].word);
  });
});

describe('Armenian input selection deletion', () => {
  it.each([
    [0, 0, 'անուն', 0],
    [0, 5, '', 0],
    [1, 1, 'նուն', 0],
    [4, 4, 'անն', 2],
    [3, 4, 'անն', 2],
    [5, 5, 'անու', 4],
  ] as const)('deletes at %i–%i without splitting ու', (start, end, value, caret) => {
    expect(deleteBackward('անուն', start, end)).toEqual({ value, caret });
  });
});
