import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, UserRound } from 'lucide-react';
import { useI18n } from '../i18n';
export type Account = { id: string; name: string; guest: false; balance: number };
import { formatTime } from '../../shared/battle-rules.mjs';
import { BalanceBadge } from './BalanceBadge';
type History = {
  totalTimeMs?: number;
  at: string;
  score: number;
  place: number;
  players: number;
  solved: number;
};
export function AccountPage({
  user,
  mode,
  onUser,
  onNavigate,
}: {
  user: Account | null;
  mode: string;
  onUser: (user: Account | null) => void;
  onNavigate: (route: string) => void;
}) {
  const { t, language } = useI18n();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<History[]>([]);
  const register = mode === 'register';
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    fetch('/api/history', { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setHistory(data.history ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [user]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (register && password !== confirm) {
      setError(t('account.mismatch'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/${register ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(t(`account.errors.${data.code}`));
        return;
      }
      setPassword('');
      setConfirm('');
      onUser(data.user);
      onNavigate('account');
    } catch {
      setError(t('account.errors.network'));
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const r = await fetch('/api/logout', { method: 'POST' });
      if (!r.ok) throw Error();
      onUser(null);
      onNavigate('login');
    } catch {
      setError(t('account.errors.network'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="account-page">
      <a href="#home" className="account-back">
        <ArrowLeft size={17} />
        {t('account.home')}
      </a>
      <section className="account-layout">
        <aside className="account-story">
          <span className="section-eyebrow">{t('title')}</span>
          <h1>{t('account.headline')}</h1>
          <p>{t('account.intro')}</p>
          <div className="account-tiles" aria-hidden="true">
            <span>բ</span>
            <span>ա</span>
            <span>ռ</span>
          </div>
          <p className="account-promise">
            <ShieldCheck size={20} />
            {t('account.promise')}
          </p>
        </aside>
        <div className="account-content">
          {user ? (
            <>
              <div className="profile-avatar">
                <UserRound size={30} />
              </div>
              <h2>{user.name}</h2>
              <p className="muted">
                @{user.id} · {t('account.signedIn')}
              </p>
              <div className="profile-balance">
                <span className="profile-balance-label">{t('account.balance')}</span>
                <BalanceBadge balance={user.balance} />
              </div>
              <a className="primary" href="#battle">
                {t('battle.title')}
                <ArrowRight size={17} />
              </a>
              <h3>{t('account.history')}</h3>
              {!history.length ? (
                <p className="history-empty">{t('account.empty')}</p>
              ) : (
                <ol className="history-list">
                  {history
                    .slice()
                    .reverse()
                    .map((item, i) => (
                      <li key={i}>
                        <time>{new Date(item.at).toLocaleDateString(language)}</time>
                        <strong>
                          {t('account.place', { place: item.place, total: item.players })}
                        </strong>
                        <span>
                          {item.score} {t('battle.points')}
                          {item.totalTimeMs !== undefined && (
                            <>
                              {' '}
                              · {t('battleTime.total')}: {formatTime(item.totalTimeMs)}
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                </ol>
              )}
              <button className="secondary" disabled={busy} onClick={() => void logout()}>
                {t('account.logout')}
              </button>
            </>
          ) : (
            <>
              <div className="account-tabs">
                <a aria-current={!register ? 'page' : undefined} href="#login">
                  {t('battle.login')}
                </a>
                <a aria-current={register ? 'page' : undefined} href="#register">
                  {t('battle.register')}
                </a>
              </div>
              <h2>{register ? t('battle.registerTitle') : t('battle.loginTitle')}</h2>
              <p className="muted">{register ? t('battle.registerText') : t('battle.loginText')}</p>
              <form className="account-form" onSubmit={(e) => void submit(e)}>
                {register && (
                  <label>
                    {t('battle.nickname')}
                    <input
                      name="name"
                      autoComplete="nickname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={32}
                    />
                  </label>
                )}
                <label>
                  {t('battle.username')}
                  <input
                    required
                    pattern="[a-zA-Z0-9_.\-]{3,24}"
                    minLength={3}
                    maxLength={24}
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-describedby="username-help"
                  />
                </label>
                <small id="username-help">{t('account.usernameHelp')}</small>
                <label>
                  {t('battle.password')}
                  <span className="password-field">
                    <input
                      required
                      minLength={8}
                      maxLength={128}
                      type={visible ? 'text' : 'password'}
                      autoComplete={register ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={t(visible ? 'account.hidePassword' : 'account.showPassword')}
                      onClick={() => setVisible(!visible)}
                    >
                      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                </label>
                {register && (
                  <label>
                    {t('account.confirmPassword')}
                    <input
                      required
                      minLength={8}
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </label>
                )}
                <button className="primary" disabled={busy} type="submit">
                  {busy
                    ? t('account.working')
                    : register
                      ? t('battle.register')
                      : t('battle.login')}
                  <ArrowRight size={17} />
                </button>
              </form>
              <a className="guest-link" href="#home">
                {t('battle.guestContinue')}
              </a>
            </>
          )}
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
