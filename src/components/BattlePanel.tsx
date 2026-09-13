import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Crown, LogIn, Play, Radio, Shield, UserPlus, Users, Wifi, WifiOff, X } from 'lucide-react';
import { answerForSeed, battleLevels, isBattleGuessCorrect } from '../game/battle';
import { useI18n } from '../i18n';

type Player = {
  id: string;
  name: string;
  score: number;
  solved: boolean;
  finished: boolean;
  connected: boolean;
};
type Message = { type: string; [key: string]: unknown };
const BATTLE_URL =
  import.meta.env.VITE_BATTLE_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
    : 'ws://localhost:8787');
export function BattlePanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const socket = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [authUser, setAuthUser] = useState('');
  const authUserRef = useRef('');
  const [authPass, setAuthPass] = useState('');
  const [authView, setAuthView] = useState<'welcome' | 'login' | 'register'>('welcome');
  const [authError, setAuthError] = useState('');
  const [roomId, setRoomId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [myId, setMyId] = useState('');
  const [phase, setPhase] = useState('idle');
  const [round, setRound] = useState(0);
  const [length, setLength] = useState(5);
  const [, setAttempts] = useState(7);
  const [seed, setSeed] = useState<number | null>(null);
  const [deadline, setDeadline] = useState(0);
  const [draft, setDraft] = useState('');
  const [, setWrong] = useState(0);
  const [message, setMessage] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [timeLeft, setTimeLeft] = useState(0);
  const answer = useMemo(
    () => (seed === null ? null : answerForSeed(length, seed)),
    [length, seed],
  );
  useEffect(() => {
    const ws = new WebSocket(BATTLE_URL);
    socket.current = ws;
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'guest' }));
    };
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as Message;
      if (msg.type === 'session') {
        const user = msg.user as { id: string; name?: string; guest?: boolean };
        setMyId(String(user.id));
        if (!user.guest) {
          setName(user.name ?? authUserRef.current);
          setAuthView('welcome');
          setAuthError('');
        }
      }
      if (msg.type === 'room_created') setRoomId(String(msg.roomId));
      if (msg.type === 'room_state') {
        setPhase(String(msg.phase));
        setRound(Number(msg.round));
        setPlayers(msg.players as Player[]);
        setMaxPlayers(Number(msg.maxPlayers));
      }
      if (msg.type === 'round_started') {
        setPhase('playing');
        setRound(Number(msg.round));
        setLength(Number(msg.length));
        setAttempts(Number(msg.attempts));
        setSeed(Number(msg.seed));
        setDeadline(Number(msg.deadline));
        setDraft('');
        setWrong(0);
        setMessage('');
      }
      if (msg.type === 'guess_result') {
        setMessage(msg.correct ? t('battle.correct') : t('battle.wrong'));
      }
      if (msg.type === 'round_finished') setMessage(t('battle.roundFinished'));
      if (msg.type === 'error') {
        const error = String(msg.message);
        setMessage(error);
        setAuthError(error);
      }
    };
    return () => ws.close();
  }, [t]);
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(
      () => setTimeLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))),
      250,
    );
    return () => window.clearInterval(timer);
  }, [deadline]);
  function send(type: string, extra = {}) {
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type, ...extra }));
  }
  function submit() {
    if (!answer || phase !== 'playing' || !draft) return;
    const correct = isBattleGuessCorrect(draft, answer);
    send('submit_guess', { guess: draft, correct });
    if (!correct) setWrong((n) => n + 1);
    setDraft('');
  }
  function authenticate(type: 'login' | 'register') {
    const username = authUser.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) {
      setAuthError(t('battle.usernameError'));
      return;
    }
    if (authPass.length < 8) {
      setAuthError(t('battle.passwordError'));
      return;
    }
    setAuthError('');
    send(type, { username, password: authPass });
  }
  const me = players.find((player) => player.id === myId || player.id.startsWith(`${myId}-`));
  return (
    <div className="battle-panel">
      <div className="battle-top">
        <div>
          <span className="section-eyebrow">
            <Radio size={13} /> {t('battle.badge')}
          </span>
          <h2>{t('battle.title')}</h2>
          <p className="muted">{t('battle.subtitle')}</p>
        </div>
        <button className="icon-button" aria-label={t('ui.closeWindow')} onClick={onClose}>
          <X size={21} />
        </button>
      </div>
      {!connected ? (
        <div className="battle-offline">
          <WifiOff size={32} />
          <h3>{t('battle.offlineTitle')}</h3>
          <p>{t('battle.offlineText')}</p>
          <p className="muted">{BATTLE_URL}</p>
        </div>
      ) : phase === 'idle' ? (
        <div className="battle-lobby-form">
          {authView === 'welcome' ? (
            <div className="battle-auth-card">
              <div className="auth-card-icon"><UserPlus size={22} /></div>
              <h3>{t('battle.accountTitle')}</h3>
              <p>{t('battle.accountText')}</p>
              <div className="auth-card-actions">
                <button className="primary" onClick={() => setAuthView('register')}><UserPlus size={16} />{t('battle.register')}</button>
                <button className="secondary" onClick={() => setAuthView('login')}><LogIn size={16} />{t('battle.login')}</button>
              </div>
              <button className="guest-link" onClick={() => setAuthView('register')}>{t('battle.guestContinue')}</button>
            </div>
          ) : (
            <div className="battle-auth-card auth-form-card">
              <button className="auth-back" onClick={() => { setAuthView('welcome'); setAuthError(''); }}>← {t('battle.back')}</button>
              <h3>{authView === 'register' ? t('battle.registerTitle') : t('battle.loginTitle')}</h3>
              <p>{authView === 'register' ? t('battle.registerText') : t('battle.loginText')}</p>
              <label>{t('battle.username')}<input autoFocus value={authUser} onChange={(e) => { setAuthUser(e.target.value); authUserRef.current = e.target.value; }} autoComplete="username" /></label>
              <label>{t('battle.password')}<input type="password" value={authPass} onChange={(e) => setAuthPass(e.target.value)} autoComplete={authView === 'register' ? 'new-password' : 'current-password'} /></label>
              {authError && <p className="auth-error" role="alert">{authError}</p>}
              <button className="primary auth-submit" onClick={() => authenticate(authView)}>{authView === 'register' ? t('battle.register') : t('battle.login')}</button>
              <small>{t('battle.accountHint')}</small>
            </div>
          )}
          <div className="battle-lobby-options">
            <label>{t('battle.nickname')}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('battle.nicknamePlaceholder')} maxLength={32} /></label>
            <label>{t('battle.players')}<select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>{[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          </div>
          <div className="battle-actions">
            <button
              className="primary"
              onClick={() => {
                send('guest', { name });
                send('create_room', { maxPlayers });
              }}
            >
              <Users size={17} />
              {t('battle.create')}
            </button>
            <div className="join-row">
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder={t('battle.roomCode')}
                maxLength={8}
              />
              <button
                className="secondary"
                onClick={() => {
                  send('guest', { name });
                  send('join_room', { roomId });
                }}
              >
                <LogIn size={17} />
                {t('battle.join')}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="battle-room">
          <div className="room-code">
            <span>
              <Shield size={17} />
              {t('battle.room')} <strong>{roomId}</strong>
            </span>
            <button className="text-button" onClick={() => navigator.clipboard?.writeText(roomId)}>
              <Copy size={15} />
              {t('battle.copy')}
            </button>
          </div>
          <div className="player-list" aria-label={t('battle.players')}>
            <h3>
              <Users size={16} />
              {players.length} / {maxPlayers} {t('battle.players')}
            </h3>
            {players.map((player) => (
              <div className={`player-row ${player.id === me?.id ? 'me' : ''}`} key={player.id}>
                <span className="player-avatar">{player.name.slice(0, 1).toUpperCase()}</span>
                <span>
                  {player.name}
                  {player.id === players[0]?.id && <Crown size={13} />}
                </span>
                <strong>{player.score}</strong>
                <span className={`presence ${player.connected ? 'online' : ''}`} />
              </div>
            ))}
          </div>
          {phase === 'lobby' && (
            <div className="battle-start">
              <p>{players.length < 2 ? t('battle.waiting') : t('battle.ready')}</p>
              <button
                className="primary"
                disabled={players.length < 2 || myId !== players[0]?.id}
                onClick={() => send('start_battle')}
              >
                <Play size={17} />
                {t('battle.start')}
              </button>
            </div>
          )}
          {phase === 'playing' && (
            <div className="battle-round">
              <div className="battle-round-meta">
                <span>
                  {t(`modes.${battleLevels[round]?.difficulty ?? 'easy'}`)} ·{' '}
                  {t('ui.round', { current: round + 1, total: battleLevels.length })}
                </span>
                <strong>{timeLeft}s</strong>
              </div>
              <div className="battle-progress">
                <span style={{ width: `${Math.max(0, Math.min(100, (timeLeft / 90) * 100))}%` }} />
              </div>
              <div className="battle-scoreline">
                <span>{t('battle.solveFirst')}</span>
                <strong>
                  {me?.score ?? 0} {t('battle.points')}
                </strong>
              </div>
              <div className="battle-entry">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submit();
                    }
                  }}
                  placeholder={t('ui.inputPlaceholder', { count: length })}
                />
                <button className="primary" onClick={submit}>
                  {t('battle.submit')}
                </button>
              </div>
              <p className="battle-message" role="status">
                {message || t('battle.live')}
              </p>
              <div className="battle-scoreboard">
                {players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((player, index) => (
                    <div key={player.id}>
                      <span>{index + 1}</span>
                      <span>{player.name}</span>
                      <strong>{player.score}</strong>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {phase === 'between' && (
            <div className="battle-finished">
              <Wifi size={26} />
              <h3>{t('battle.next')}</h3>
              <p>{message}</p>
            </div>
          )}
          {phase === 'finished' && (
            <div className="battle-finished">
              <Crown size={31} />
              <h3>{t('battle.over')}</h3>
              {players
                .slice()
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <p key={player.id}>
                    {index + 1}. {player.name} — <strong>{player.score}</strong>
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
      <p className="battle-footnote">{t('battle.privacy')}</p>
    </div>
  );
}
