import { useEffect, useEffectEvent, useRef, useState, type CSSProperties } from 'react';
import { Copy, Crown, LogIn, Play, Users, ArrowLeft, Radio } from 'lucide-react';
import { comparePlayers, elapsedRound, formatTime } from '../../shared/battle-rules.mjs';
import { letters, mergeKeyboard } from '../game/engine';
import { deleteBackward, isArmenian, normalizeWord } from '../game/armenian';
import type { Mark } from '../game/types';
import { markSymbols } from '../game/presentation';
import { Keyboard } from './Keyboard';
import { RewardBanner } from './BalanceBadge';
import { useI18n } from '../i18n';
type Player = {
  id: string;
  name: string;
  score: number;
  solved: boolean;
  finished: boolean;
  connected: boolean;
  solvedCount: number;
  totalTimeMs: number;
};
type Guess = { guess: string; marks: Mark[] };
type Round = {
  round: number;
  length: number;
  attempts: number;
  level: string;
  deadline: number | null;
  startedAt: number;
};
export function BattlePanel({
  onClose,
  onBalance,
}: {
  onClose: () => void;
  onBalance?: (balance: number) => void;
}) {
  const { t } = useI18n();
  const socket = useRef<WebSocket | null>(null);
  const onBalanceEvent = useEffectEvent((balance: number) => {
    onBalance?.(balance);
  });
  const [connection, setConnection] = useState('connecting');
  const [retry, setRetry] = useState(0);
  const [myId, setMyId] = useState('');
  const [name, setName] = useState('');
  const [guest, setGuest] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [hostId, setHostId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState('idle');
  const [roundSeconds, setRoundSeconds] = useState('90');
  const serverOffset = useRef(0);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [round, setRound] = useState<Round | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [scoreDelta, setScoreDelta] = useState<number | null>(null);
  const [matchReward, setMatchReward] = useState<number | null>(null);
  const [reveal, setReveal] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const ws = new WebSocket(
      import.meta.env.VITE_BATTLE_URL ??
        `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`,
    );
    socket.current = ws;
    ws.onopen = () => setConnection('online');
    ws.onclose = () => {
      setConnection('offline');
      setPending(false);
    };
    ws.onerror = () => setConnection('offline');
    ws.onmessage = (event) => {
      const m = JSON.parse(event.data);
      if (m.type === 'session') {
        setMyId(m.playerId);
        setName(m.user.name);
        setGuest(m.user.guest);
      }
      if (m.type === 'joined') {
        setMyId(m.playerId);
        setPending(false);
      }
      if (m.type === 'left') {
        setPhase('idle');
        setRoomId('');
        setPlayers([]);
        setRound(null);
        setPending(false);
        setMatchReward(null);
      }
      if (m.type === 'room_state') {
        setRoundSeconds(String(m.roundSeconds ?? 90));
        serverOffset.current = (m.serverNow ?? Date.now()) - Date.now();
        setNow(Date.now() + serverOffset.current);
        setRoomId(m.roomId);
        setHostId(m.hostId);
        setPlayers(m.players);
        setPhase(m.phase);
        setMaxPlayers(m.maxPlayers);
        setPending(false);
      }
      if (m.type === 'round_started') {
        setRound(m);
        setPhase('playing');
        setGuesses([]);
        setDraft('');
        setReveal('');
        setScoreDelta(null);
        setError('');
        setPending(false);
        setNow(Date.now() + serverOffset.current);
      }
      if (m.type === 'guess_result') {
        setScoreDelta(m.scoreDelta ?? 0);
        setGuesses((prev) => [...prev, { guess: m.guess, marks: m.marks }]);
        setDraft('');
        setPending(false);
      }
      if (m.type === 'balance' && typeof m.balance === 'number') {
        onBalanceEvent(m.balance);
        if (m.reason === 'battle_win' && typeof m.rewarded === 'number') setMatchReward(m.rewarded);
      }
      if (m.type === 'round_finished') {
        setReveal(m.answer);
        setPending(false);
      }
      if (m.type === 'error') {
        setError(m.code);
        setPending(false);
      }
    };
    return () => {
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      ws.close();
      socket.current = null;
    };
  }, [retry]);
  useEffect(() => {
    if (phase !== 'playing') return;
    const timer = window.setInterval(() => setNow(Date.now() + serverOffset.current), 250);
    return () => clearInterval(timer);
  }, [phase]);
  function send(type: string, extra = {}) {
    if (socket.current?.readyState !== 1) return;
    setError('');
    socket.current.send(JSON.stringify({ type, ...extra }));
  }
  const me = players.find((p) => p.id === myId);
  const finished = me?.finished ?? false;
  const disabled = phase !== 'playing' || finished || pending || connection !== 'online';
  function change(value: string) {
    if (value && !isArmenian(value)) {
      setError('armenianOnly');
      return;
    }
    if (round && letters(value).length > round.length) {
      setError('correctLength');
      return;
    }
    setDraft(normalizeWord(value));
    setError('');
  }
  function submit() {
    if (disabled) return;
    setPending(true);
    send('submit_guess', { guess: draft });
  }
  function key(value: string) {
    if (disabled) return;
    if (value === 'Enter') submit();
    else if (value === 'Backspace') change(deleteBackward(draft, draft.length, draft.length).value);
    else change(draft + value);
  }
  const wordInput = useRef<HTMLInputElement>(null);
  const physicalKey = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      disabled ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.isComposing ||
      target.closest('input,select,textarea,[contenteditable="true"]')
    )
      return;
    if (target.closest('button,a') && (event.key === 'Enter' || event.key === ' ')) return;
    if (event.key === 'Enter' || event.key === 'Backspace' || /^[Ա-Ֆա-ֆև]$/.test(event.key)) {
      event.preventDefault();
      if (event.key !== 'Enter') wordInput.current?.focus();
      key(event.key);
    }
  });
  useEffect(() => {
    const handle = (event: KeyboardEvent) => physicalKey(event);
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  const keyboard = guesses.reduce(
    (state, item) => mergeKeyboard(state, item.guess, item.marks),
    {},
  );
  const timeLeft =
    round?.deadline != null ? Math.max(0, Math.ceil((round.deadline - now) / 1000)) : 0;
  const totalTime = (p: Player) =>
    (p.totalTimeMs ?? 0) +
    (phase === 'playing' && !p.finished && round
      ? elapsedRound(round.startedAt ?? now, round.deadline, now)
      : 0);
  const ranked = players.slice().sort(comparePlayers);
  const validDuration = /^\d+$/.test(roundSeconds) && Number(roundSeconds) <= 3600;
  const errorKey = ['armenianOnly', 'correctLength', 'notInDictionary'].includes(error)
    ? `validation.${error}`
    : error === 'duration'
      ? 'battleTime.invalid'
      : `account.errors.${error}`;
  return (
    <div className="battle-panel">
      <a className="account-back" href="#home" onClick={onClose}>
        <ArrowLeft size={17} />
        {t('account.home')}
      </a>
      <div className="battle-top">
        <div>
          <span className="section-eyebrow">
            <Radio size={14} />
            BATTLE
          </span>
          <h1>{t('battle.title')}</h1>
          <p className="muted">{t('battle.subtitle')}</p>
        </div>
        <span role="status" className={`connection ${connection}`}>
          {t(`account.${connection}`)}
        </span>
      </div>
      {connection === 'offline' ? (
        <div className="battle-offline">
          <h2>{t('battle.offlineTitle')}</h2>
          <p>{t('account.disconnected')}</p>
          <button
            className="primary"
            onClick={() => {
              setPhase('idle');
              setConnection('connecting');
              setRetry((n) => n + 1);
            }}
          >
            {t('errors.retry')}
          </button>
        </div>
      ) : phase === 'idle' ? (
        <div className="battle-lobby-grid">
          <section className="lobby-card">
            <h2>{t('battle.create')}</h2>
            <p>{t('account.createText')}</p>
            {guest ? (
              <label>
                {t('battle.nickname')}
                <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
              </label>
            ) : (
              <p className="signed-label">
                {name} · {t('account.signedIn')}
              </p>
            )}
            <label>
              {t('battle.players')}
              <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              {t('battleTime.duration')}
              <input
                type="number"
                min="0"
                max="3600"
                step="1"
                value={roundSeconds}
                aria-label={t('battleTime.duration')}
                aria-describedby="duration-help"
                onChange={(e) => setRoundSeconds(e.target.value)}
              />
              <small id="duration-help">{t('battleTime.hint')}</small>
            </label>
            {!validDuration && (
              <p role="alert" className="auth-error">
                {t('battleTime.invalid')}
              </p>
            )}
            <button
              className="primary"
              disabled={connection !== 'online' || pending || !validDuration}
              onClick={() => {
                if (guest) send('guest', { name });
                setPending(true);
                send('create_room', { maxPlayers, roundSeconds: Number(roundSeconds) });
              }}
            >
              <Users size={18} />
              {t('battle.create')}
            </button>
          </section>
          <section className="lobby-card">
            <h2>{t('battle.join')}</h2>
            <p>{t('account.joinText')}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (guest) send('guest', { name });
                setPending(true);
                send('join_room', { roomId: joinCode });
              }}
            >
              <label>
                {t('battle.roomCode')}
                <input
                  required
                  pattern="[A-Za-z0-9]{8}"
                  minLength={8}
                  maxLength={8}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
              </label>
              <button className="secondary" disabled={connection !== 'online' || pending}>
                <LogIn size={18} />
                {t('battle.join')}
              </button>
            </form>
            <div className="quick-match">
              <p>{t('account.quickText')}</p>
              <button
                className="text-button"
                disabled={connection !== 'online' || pending || !validDuration}
                onClick={() => {
                  if (guest) send('guest', { name });
                  setPending(true);
                  send('quick_match', { maxPlayers, roundSeconds: Number(roundSeconds) });
                }}
              >
                {t('account.quickMatch')}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="battle-match">
          <div className="room-code">
            <span>
              {t('battle.room')} <strong>{roomId}</strong>
            </span>
            <button
              className="text-button"
              onClick={() => {
                void navigator.clipboard
                  .writeText(roomId)
                  .then(() => setCopied(true))
                  .catch(() => setError('clipboard'));
              }}
            >
              <Copy size={16} />
              {t(copied ? 'account.copied' : 'battle.copy')}
            </button>
            <button className="text-button" onClick={() => send('leave_room')}>
              {t('account.leave')}
            </button>
          </div>
          <section className="battle-time-summary" aria-label={t('battleTime.total')}>
            <div className="time-summary-heading">
              <strong>{t('battleTime.total')}</strong>
              <span>
                {t('battleTime.limit')}:{' '}
                {Number(roundSeconds) === 0
                  ? t('battleTime.unlimited')
                  : `${roundSeconds} ${t('account.seconds')}`}
              </span>
            </div>
            <div className="player-times">
              {players.map((p) => (
                <div className={`player-time ${p.id === myId ? 'me' : ''}`} key={p.id}>
                  <span>{p.name}</span>
                  <strong>{formatTime(totalTime(p))}</strong>
                  <small>
                    {p.solvedCount} / 4 · {t('battleTime.solved')}
                  </small>
                </div>
              ))}
            </div>
          </section>
          <div className="battle-match-grid">
            <section className="battle-game">
              {phase === 'lobby' ? (
                <div className="battle-waiting">
                  <Users size={44} />
                  <h2>{t('account.waitingTitle')}</h2>
                  <p>{t('account.shareCode')}</p>
                  <strong className="invitation-code">{roomId}</strong>
                  <p>{players.length < 2 ? t('battle.waiting') : t('battle.ready')}</p>
                  {hostId === myId ? (
                    <button
                      className="primary"
                      disabled={players.length < 2 || pending}
                      onClick={() => {
                        setPending(true);
                        send('start_battle');
                      }}
                    >
                      <Play size={18} />
                      {t('battle.start')}
                    </button>
                  ) : (
                    <p>{t('account.waitHost')}</p>
                  )}
                </div>
              ) : (
                round && (
                  <>
                    <div className="battle-round-meta">
                      <strong>{t(`modes.${round.level}`)}</strong>
                      <span>{t('ui.round', { current: round.round + 1, total: 4 })}</span>
                      <strong>
                        {phase === 'playing'
                          ? round.deadline === null
                            ? t('battleTime.unlimited')
                            : `${timeLeft} ${t('account.seconds')}`
                          : t('battle.roundFinished')}
                      </strong>
                    </div>
                    {scoreDelta !== null && (
                      <p className="battle-result-note" role="status">
                        {t('battleScoring.change', {
                          points: `${scoreDelta > 0 ? '+' : ''}${scoreDelta}`,
                        })}
                      </p>
                    )}
                    <div
                      className={`board ${round.length > 10 ? 'long-board' : ''}`}
                      style={{ '--letters': round.length, '--tile-size': '48px' } as CSSProperties}
                      aria-label={t('ui.gameLabel')}
                    >
                      {Array.from({ length: round.attempts }, (_, row) => {
                        const result = guesses[row];
                        const chars = letters(
                          result?.guess ?? (row === guesses.length ? draft : ''),
                        );
                        return (
                          <div className="tile-row" key={row}>
                            {Array.from({ length: round.length }, (_, col) => {
                              const mark = result?.marks[col];
                              return (
                                <div
                                  key={col}
                                  className={`tile ${mark ?? 'neutral'} ${chars[col] ? 'filled' : ''}`}
                                  aria-label={`${chars[col] ?? ''} ${mark ? t(`helpContent.${mark}`) : ''}`}
                                >
                                  <span>{chars[col]}</span>
                                  {mark && <small>{markSymbols[mark]}</small>}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                    {phase === 'playing' && !finished ? (
                      <>
                        <form
                          className="word-entry"
                          onSubmit={(e) => {
                            e.preventDefault();
                            submit();
                          }}
                        >
                          <input
                            autoFocus
                            key={round.round}
                            placeholder={t('ui.inputPlaceholder', { count: round.length })}
                            aria-label={t('ui.inputLabel')}
                            ref={wordInput}
                            value={draft}
                            onChange={(e) => change(e.target.value)}
                            autoComplete="off"
                          />
                          <button disabled={pending}>{t('ui.check')}</button>
                        </form>
                        <Keyboard state={keyboard} onKey={key} disabled={disabled} />
                      </>
                    ) : (
                      <p className="battle-result-note">
                        {reveal
                          ? t('ui.answer', { word: reveal })
                          : me?.solved
                            ? t('battle.correct')
                            : t('account.attemptsUsed')}
                      </p>
                    )}
                    {phase === 'finished' && (
                      <div className="battle-final">
                        <Crown size={28} />
                        <h2>{t('battle.over')}</h2>
                        <p>
                          {ranked
                            .filter((p) => comparePlayers(p, ranked[0]) === 0)
                            .map((p) => p.name)
                            .join(', ')}
                        </p>
                        {matchReward !== null && me && comparePlayers(me, ranked[0]) === 0 && (
                          <>
                            <RewardBanner amount={matchReward} label={t('account.kopeckUnit')} />
                            <p className="reward-caption">
                              {t('account.battleReward', { count: matchReward })}
                            </p>
                          </>
                        )}
                        <button className="primary" onClick={() => send('leave_room')}>
                          {t('playAgain')}
                        </button>
                      </div>
                    )}
                  </>
                )
              )}
            </section>
            <aside className="battle-scoreboard">
              <h2>{t('account.scoreboard')}</h2>
              <p>
                {players.length} / {maxPlayers} {t('battle.players')}
              </p>
              {ranked.map((p) => (
                <div className={`player-row ${p.id === myId ? 'me' : ''}`} key={p.id}>
                  <span className="player-avatar">{p.name.slice(0, 1)}</span>
                  <span>
                    {p.name}
                    <small>
                      {formatTime(totalTime(p))} · {p.solvedCount} / 4 ·{' '}
                      {t(p.connected ? 'account.online' : 'account.offline')}
                    </small>
                  </span>
                  <strong>{p.score}</strong>
                </div>
              ))}
              <p className="scoring-note">{t('account.scoring')}</p>
            </aside>
          </div>
        </div>
      )}
      {error && (
        <p className="auth-error" role="alert">
          {t(errorKey, { length: round?.length ?? 0 })}
        </p>
      )}
    </div>
  );
}
