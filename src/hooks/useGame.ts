import { useI18n } from '../i18n';
import { useState } from 'react';
import { answers } from '../data/dictionary';
import {
  attemptsFor,
  chooseWord,
  emptyStats,
  evaluateGuess,
  filterAnswers,
  gameStatus,
  isArmenian,
  letters,
  mergeKeyboard,
  normalizeWord,
  updateStats,
  validateGuess,
} from '../game/engine';
import { isHistory, isSettings, isStats, safeRead, safeWrite, storageKeys } from '../game/storage';
import type { KeyboardState, Round, Settings } from '../game/types';

export const defaultSettings: Settings = {
  mode: 'easy',
  length: 5,
  attempts: 6,
  difficulty: 'all',
};

function makeRound(settings: Settings): Round | null {
  const pool = filterAnswers(
    settings.mode === 'custom' ? settings.difficulty : settings.mode,
    settings.mode === 'custom' ? settings.length : undefined,
  );
  const history = safeRead(storageKeys.history, [], isHistory);
  const selection = chooseWord(pool, history);
  if (!selection) return null;
  safeWrite(storageKeys.history, selection.history);
  return {
    answer: selection.answer,
    guesses: [],
    attempts: attemptsFor(settings.mode, letters(selection.answer.word).length, settings.attempts),
    mode: settings.mode,
    hintUsed: false,
    revealed: {},
    clueShown: false,
  };
}

function knownCorrectPositions(round: Round): Set<number> {
  const known = new Set<number>();
  for (const guess of round.guesses) {
    evaluateGuess(guess, round.answer.word).forEach((mark, index) => {
      if (mark === 'correct') known.add(index);
    });
  }
  for (const key of Object.keys(round.revealed)) known.add(Number(key));
  return known;
}

export function useGame() {
  const { t } = useI18n();
  const [settings, setSettingsState] = useState(() =>
    safeRead(storageKeys.settings, defaultSettings, isSettings),
  );
  const [round, setRound] = useState<Round>(
    () =>
      makeRound(settings) ??
      makeRound(defaultSettings) ?? {
        answer: answers[0],
        guesses: [],
        attempts: 7,
        mode: 'easy',
        hintUsed: false,
        revealed: {},
        clueShown: false,
      },
  );
  const [stats, setStats] = useState(() => safeRead(storageKeys.stats, emptyStats(), isStats));
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [errorId, setErrorId] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  const [paidClue, setPaidClue] = useState('');
  const [skippedWord, setSkippedWord] = useState('');
  const status = gameStatus(round.answer.word, round.guesses, round.attempts);
  const length = letters(round.answer.word).length;
  const keyboard = round.guesses.reduce<KeyboardState>(
    (state, guess) => mergeKeyboard(state, guess, evaluateGuess(guess, round.answer.word)),
    {},
  );

  function error(text: string) {
    setMessage(text);
    setErrorId((n) => n + 1);
  }
  function setSettings(next: Settings) {
    setSettingsState(next);
    safeWrite(storageKeys.settings, next);
  }
  function replaceDraft(value: string) {
    if (status !== 'playing') return;
    if (value && !isArmenian(value)) {
      error('Մուտքագրիր միայն հայերեն տառեր');
      return;
    }
    const normalized = normalizeWord(value);
    if (letters(normalized).length > length) {
      error(`Բառը պետք է ունենա ${length} տառ`);
      return;
    }
    setDraft(normalized);
    setMessage('');
  }
  function submit() {
    if (status !== 'playing') return;
    const invalid = draft ? validateGuess(draft, length) : `Մուտքագրիր ${length} տառանոց բառ`;
    if (invalid) {
      error(invalid);
      return;
    }
    const guesses = [...round.guesses, normalizeWord(draft)];
    const nextStatus = gameStatus(round.answer.word, guesses, round.attempts);
    setRound({ ...round, guesses });
    setDraft('');
    setMessage('');
    if (nextStatus !== 'playing') {
      const next = updateStats(stats, nextStatus === 'won', guesses.length);
      setStats(next);
      safeWrite(storageKeys.stats, next);
      setResultOpen(true);
    }
  }
  function key(value: string) {
    if (value === 'Enter') submit();
    else if (value === 'Backspace') {
      setDraft(letters(draft).slice(0, -1).join(''));
      setMessage('');
    } else replaceDraft(draft + value);
  }
  function start(next = settings) {
    const newRound = makeRound(next);
    if (!newRound) {
      error('Այս ընտրությամբ գաղտնի բառ չկա։ Փոխիր երկարությունը կամ բարդությունը։');
      return false;
    }
    setSettings(next);
    setRound(newRound);
    setDraft('');
    setMessage('');
    setPaidClue('');
    setSkippedWord('');
    setResultOpen(false);
    return true;
  }
  function hint() {
    if (round.mode === 'easy' && !round.hintUsed && status === 'playing')
      setRound({ ...round, hintUsed: true });
  }
  function canRevealLetter() {
    if (status !== 'playing') return false;
    const answerLetters = letters(round.answer.word);
    const known = knownCorrectPositions(round);
    return answerLetters.some((_, index) => !known.has(index));
  }
  function revealLetter() {
    if (status !== 'playing') return null;
    const answerLetters = letters(round.answer.word);
    const known = knownCorrectPositions(round);
    const index = answerLetters.findIndex((_, i) => !known.has(i));
    if (index < 0) return null;
    const letter = answerLetters[index];
    setRound({ ...round, revealed: { ...round.revealed, [index]: letter } });
    setMessage('');
    return { index, letter };
  }
  function canShowClue() {
    return status === 'playing' && !round.clueShown && Boolean(round.answer.hint);
  }
  function showClue() {
    if (!canShowClue()) return null;
    const text = round.answer.hint ?? '';
    setRound({ ...round, clueShown: true });
    setPaidClue(text);
    setMessage('');
    return text;
  }
  function skipWord() {
    if (status !== 'playing') return null;
    const previous = round.answer.word;
    const newRound = makeRound(settings);
    if (!newRound) {
      error('Այս ընտրությամբ գաղտնի բառ չկա։ Փոխիր երկարությունը կամ բարդությունը։');
      return null;
    }
    setSkippedWord(previous);
    setRound(newRound);
    setDraft('');
    setPaidClue('');
    setMessage('');
    setResultOpen(false);
    return previous;
  }
  function resetStats() {
    const next = emptyStats();
    setStats(next);
    safeWrite(storageKeys.stats, next);
  }
  return {
    settings,
    setSettings,
    round,
    stats,
    draft,
    replaceDraft,
    message: !message
      ? ''
      : message === 'Մուտքագրիր միայն հայերեն տառեր'
        ? t('validation.armenianOnly')
        : message === 'Այս բառը բառարանում չկա'
          ? t('validation.notInDictionary')
          : message.includes('տառ')
            ? t('validation.correctLength', { length })
            : t('ui.none'),
    errorId,
    status,
    length,
    keyboard,
    submit,
    key,
    start,
    hint,
    canRevealLetter,
    revealLetter,
    canShowClue,
    showClue,
    skipWord,
    paidClue,
    skippedWord,
    resetStats,
    resultOpen,
    setResultOpen,
  };
}
