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
  };
}
export function useGame() {
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
      },
  );
  const [stats, setStats] = useState(() => safeRead(storageKeys.stats, emptyStats(), isStats));
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [errorId, setErrorId] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
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
    setResultOpen(false);
    return true;
  }
  function hint() {
    if (round.mode === 'easy' && !round.hintUsed && status === 'playing')
      setRound({ ...round, hintUsed: true });
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
    message,
    errorId,
    status,
    length,
    keyboard,
    submit,
    key,
    start,
    hint,
    resetStats,
    resultOpen,
    setResultOpen,
  };
}
