import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CircleHelp,
  Lightbulb,
  Moon,
  RotateCcw,
  Settings2,
  Sparkles,
  Sun,
  Trophy,
  X,
  Swords,
} from 'lucide-react';
import { deleteBackward } from './game/armenian';
import { Board } from './components/Board';
import { Keyboard } from './components/Keyboard';
import { Modal } from './components/Modal';
import { SettingsPanel } from './components/SettingsPanel';
import { Statistics } from './components/Statistics';
import { Help } from './components/Help';
import { LanguageSwitcher } from './components/LanguageSwitcher';

import { answers } from './data/dictionary';
import { useGame } from './hooks/useGame';
import { letters } from './game/engine';

import { useI18n } from './i18n';
import type { Theme } from './game/types';
import type { Account } from './components/AccountPage';
import { BalanceBadge } from './components/BalanceBadge';
export default function App({
  account,
  onAccount,
  theme,
  setTheme,
}: {
  account?: Account | null;
  onAccount?: (user: Account | null) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  const game = useGame();
  const { t, language } = useI18n();
  const accountName = account?.name;
  const rewardedWin = useRef<string | null>(null);
  const [dialog, setDialog] = useState<
    'help' | 'stats' | 'settings' | 'reset' | 'restart' | 'battle' | null
  >(null);
  const input = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  useEffect(() => {
    if (game.status !== 'won' || !account || !onAccount) return;
    const winKey = `${game.round.answer.word}:${game.round.guesses.length}`;
    if (rewardedWin.current === winKey) return;
    rewardedWin.current = winKey;
    const abort = new AbortController();
    fetch('/api/rewards/solo-win', { method: 'POST', signal: abort.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.user) onAccount(data.user);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [game.status, game.round.answer.word, game.round.guesses.length, account, onAccount]);
  useLayoutEffect(() => {
    if (pendingCaret.current !== null) {
      input.current?.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [game.draft]);
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (
        dialog ||
        game.resultOpen ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.isComposing ||
        target.closest('input, select, textarea, [contenteditable="true"]')
      )
        return;
      if (target.closest('button') && (event.key === 'Enter' || event.key === ' ')) return;
      if (event.key === 'Enter' || event.key === 'Backspace' || /^[Ա-Ֆա-ֆև]$/.test(event.key)) {
        event.preventDefault();
        // Physical typing leaves the virtual key so Enter submits the word.
        if (event.key !== 'Enter') input.current?.focus();
        game.key(event.key);
      } else if (event.key.length === 1 && event.key !== '\t')
        game.replaceDraft(game.draft + event.key);
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [dialog, game]);
  function start() {
    if (game.status === 'playing' && (game.round.guesses.length || game.draft))
      setDialog('restart');
    else {
      game.start();
      input.current?.focus();
    }
  }
  const close = () => setDialog(null);
  return (
    <>
      <a className="skip-link" href="#game">
        {t('ui.skip')}
      </a>
      <div className="app-shell">
        <header className="header">
          <a className="brand" href="./" aria-label={t('account.home')}>
            <span className="brand-mark">
              բ<span />
            </span>
            <span>
              {t('title')}
              <small>{t('ui.tagline')}</small>
            </span>
          </a>
          <nav aria-label={t('language')}>
            <button className="header-help" onClick={() => setDialog('help')}>
              <CircleHelp size={19} />
              <span>{t('ui.howToPlay')}</span>
            </button>
            <a className="header-help battle-link" href="#battle">
              <Swords size={18} />
              <span>{t('battle.title')}</span>
            </a>
            {account && <BalanceBadge balance={account.balance} />}
            <a className="account-nav" href={accountName ? '#account' : '#login'}>
              {accountName ?? t('battle.login')}
            </a>
            <span className="nav-divider" />
            <button
              className="icon-button"
              aria-label={t('stats')}
              title={t('stats')}
              onClick={() => setDialog('stats')}
            >
              <BarChart3 size={21} />
            </button>
            <button
              className="icon-button"
              aria-label={t('settings')}
              title={t('settings')}
              onClick={() => setDialog('settings')}
            >
              <Settings2 size={21} />
            </button>
            <button
              className="icon-button"
              aria-label={theme === 'light' ? t('ui.themeDarkAction') : t('ui.themeLightAction')}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <LanguageSwitcher />
          </nav>
        </header>
        <main>
          <section className="intro">
            <div>
              <div className="eyebrow">
                <span /> {t('ui.eyebrow')}
              </div>
              <h1>{t('ui.headline')}</h1>
              <p>{t('ui.subtitle')}</p>
            </div>
            <div className="intro-art" aria-hidden="true">
              <span className="mini-tile">բ</span>
              <span className="mini-tile">ա</span>
              <span className="mini-tile">ռ</span>
              <Sparkles size={21} />
            </div>
          </section>
          <div className="workspace">
            <SettingsPanel settings={game.settings} onChange={game.setSettings} onStart={start} />
            <section className="game-card" id="game" tabIndex={-1} aria-label={t('ui.gameLabel')}>
              <div className="game-toolbar">
                <div className="game-meta">
                  <span className="level-badge">
                    <span />
                    {t(`modes.${game.round.mode}`)}
                  </span>
                  <span>{t('ui.letterWord', { count: game.length })}</span>
                  <span className="meta-dot">·</span>
                  <span>{t('ui.attemptsWord', { count: game.round.attempts })}</span>
                </div>
                <button className="text-button" onClick={start}>
                  <RotateCcw size={15} />
                  <span>{t('newGame')}</span>
                </button>
              </div>
              <div className="play-area">
                <div className="round-heading">
                  <span>
                    {game.status === 'playing'
                      ? t('ui.round', {
                          current: game.round.guesses.length + 1,
                          total: game.round.attempts,
                        })
                      : game.status === 'won'
                        ? t('ui.found')
                        : t('ui.finished')}
                  </span>
                  {game.round.mode === 'easy' && (
                    <button
                      className="hint-button"
                      onClick={game.hint}
                      disabled={game.round.hintUsed || game.status !== 'playing'}
                    >
                      <Lightbulb size={15} />
                      {t('hint')} <span>1</span>
                    </button>
                  )}
                </div>
                <Board
                  round={game.round}
                  draft={game.draft}
                  status={game.status}
                  errorId={game.errorId}
                />
                <div
                  className={`game-message ${game.message ? 'error-message' : ''}`}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {game.message ||
                    (game.status === 'won'
                      ? t('ui.congrats', { word: game.round.answer.word })
                      : game.status === 'lost'
                        ? `${t('gameStatus.lost')} ${game.round.answer.word}`
                        : game.round.hintUsed
                          ? t('ui.hintTheme', {
                              theme: t(`themes.${game.round.answer.theme}`),
                              letter: letters(game.round.answer.word)[0],
                            })
                          : t('ui.newRound'))}
                </div>
                {game.status === 'playing' ? (
                  <form
                    className="word-entry"
                    onSubmit={(e) => {
                      e.preventDefault();
                      game.submit();
                    }}
                  >
                    <input
                      ref={input}
                      aria-label={t('ui.inputLabel')}
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={game.draft}
                      onChange={(e) => game.replaceDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey) {
                          e.preventDefault();
                          const edit = deleteBackward(
                            game.draft,
                            e.currentTarget.selectionStart ?? 0,
                            e.currentTarget.selectionEnd ?? 0,
                          );
                          if (edit.value !== game.draft) {
                            pendingCaret.current = edit.caret;
                            game.replaceDraft(edit.value);
                          }
                        }
                      }}
                      placeholder={t('ui.inputPlaceholder', { count: game.length })}
                    />
                    <button aria-label={t('ui.submitWord')} type="submit">
                      <ArrowRight size={18} />
                    </button>
                  </form>
                ) : (
                  <button
                    className="primary play-again-inline"
                    onClick={() => {
                      game.start();
                    }}
                  >
                    {t('playAgain')} <ArrowRight size={17} />
                  </button>
                )}
              </div>
              <div className="keyboard-section">
                <Keyboard
                  state={game.keyboard}
                  onKey={game.key}
                  disabled={game.status !== 'playing'}
                />
                <div className="keyboard-caption">
                  <span className="keyboard-dot" /> {t('ui.keyboardHint')}
                </div>
              </div>
            </section>
          </div>
          <section className="legend" aria-label={t('ui.legendLabel')}>
            <div>
              <span className="legend-box correct">✓</span>
              <span>{t('ui.legendCorrect')}</span>
            </div>
            <div>
              <span className="legend-box present">•</span>
              <span>{t('ui.legendPresent')}</span>
            </div>
            <div>
              <span className="legend-box absent">−</span>
              <span>{t('ui.legendAbsent')}</span>
            </div>
          </section>
        </main>
        <footer>
          <span>
            <BookOpen size={16} /> {t('ui.footerMotto')}
          </span>
          <span>{t('ui.footer', { count: answers.length })}</span>
        </footer>
      </div>
      <Modal title={t('ui.howToPlay')} open={dialog === 'help'} onClose={close}>
        <Help />
      </Modal>
      <Modal title={t('statistics.played')} open={dialog === 'stats'} onClose={close}>
        <Statistics stats={game.stats} onReset={() => setDialog('reset')} />
      </Modal>
      <Modal title={t('settings')} open={dialog === 'settings'} onClose={close}>
        <p className="muted">{t('ui.appearanceText')}</p>
        <div className="appearance">
          <h3>
            {t('theme.light')}/{t('theme.dark')}
          </h3>
          <div className="theme-options">
            <button aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
              <Sun size={22} />
              {t('theme.light')}
            </button>
            <button aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Moon size={22} />
              {t('theme.dark')}
            </button>
          </div>
        </div>
        <p className="settings-info">{t('ui.settingsInfo')}</p>
        <p className="muted">{t('ui.motionInfo')}</p>
        <button className="primary" onClick={close}>
          {t('ui.saveClose')}
        </button>
      </Modal>
      <Modal
        title={t('confirmations.resetStats')}
        open={dialog === 'reset'}
        onClose={() => setDialog('stats')}
      >
        <p>{t('ui.resetInfo')}</p>
        <div className="modal-actions">
          <button className="secondary" onClick={() => setDialog('stats')}>
            {t('cancel')}
          </button>
          <button
            className="danger-button"
            onClick={() => {
              game.resetStats();
              setDialog('stats');
            }}
          >
            {t('ui.resetConfirm')}
          </button>
        </div>
      </Modal>
      <Modal
        title={t('confirmations.newGameInProgress')}
        open={dialog === 'restart'}
        onClose={close}
      >
        <p>{t('ui.inProgress')}</p>
        <div className="modal-actions">
          <button className="secondary" onClick={close}>
            {t('ui.continueGame')}
          </button>
          <button
            className="primary"
            onClick={() => {
              if (game.start()) {
                close();
                input.current?.focus();
              }
            }}
          >
            {t('ui.startNewGame')}
          </button>
        </div>
      </Modal>
      <Modal
        title={game.status === 'won' ? t('ui.winTitle') : t('ui.lossTitle')}
        open={game.resultOpen}
        delay={1150}
        onClose={() => game.setResultOpen(false)}
      >
        <div className={`result ${game.status === 'won' ? 'win-result' : ''}`}>
          <div className="result-icon">
            {game.status === 'won' ? <Trophy size={38} /> : <BookOpen size={38} />}
          </div>
          <p className="muted">{t('ui.answerLabel')}</p>
          <strong className="answer-word">{game.round.answer.word}</strong>
          <p>
            {language === 'hy' && game.round.answer.definition
              ? game.round.answer.definition
              : t('ui.themeValue', { theme: t(`themes.${game.round.answer.theme}`) })}
          </p>
          <div className="result-details">
            <span>{t(`modes.${game.round.mode}`)}</span>
            <span>{t('ui.letterWord', { count: game.length })}</span>
            <span>{t('ui.attemptsWord', { count: game.round.guesses.length })}</span>
          </div>
          <p>
            {game.status === 'won'
              ? t('ui.resultFound', { count: game.round.guesses.length })
              : t('ui.resultMissed')}
          </p>
          <button className="primary" onClick={() => game.start()}>
            {t('playAgain')} <ArrowRight size={18} />
          </button>
          <button className="text-button" onClick={() => game.setResultOpen(false)}>
            <X size={15} />
            {t('ui.viewBoard')}
          </button>
        </div>
      </Modal>
    </>
  );
}
