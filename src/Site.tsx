import { useEffect, useState } from 'react';
import { Moon, Sun, UserRound } from 'lucide-react';
import App from './App';
import { AccountPage, type Account } from './components/AccountPage';
import { BalanceBadge } from './components/BalanceBadge';
import { BattlePanel } from './components/BattlePanel';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { useI18n } from './i18n';
import { safeRead, safeWrite, isTheme, storageKeys } from './game/storage';
import type { Theme } from './game/types';
export default function Site() {
  const { t } = useI18n();
  const [route, setRoute] = useState(location.hash.slice(1) || 'home');
  const [user, setUser] = useState<Account | null>(null);
  const [theme, setTheme] = useState<Theme>(() =>
    safeRead(
      storageKeys.theme,
      matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      isTheme,
    ),
  );
  const dark = theme === 'dark';
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeWrite(storageKeys.theme, theme);
  }, [theme]);
  useEffect(() => {
    const handler = () => setRoute(location.hash.slice(1) || 'home');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/session', { signal: abort.signal })
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  const navigate = (next: string) => {
    location.hash = next;
  };
  if (!['login', 'register', 'account', 'battle'].includes(route))
    return <App account={user} theme={theme} setTheme={setTheme} />;
  return (
    <div className="app-shell">
      <header className="header site-header">
        <a className="brand" href="#home">
          <span className="brand-mark">բ</span>
          <span>
            {t('title')}
            <small>{t('ui.tagline')}</small>
          </span>
        </a>
        <nav aria-label={t('account.navigation')}>
          {user && <BalanceBadge balance={user.balance} />}
          <a className="header-help" href={user ? '#account' : '#login'}>
            <UserRound size={19} />
            <span>{user?.name ?? t('battle.login')}</span>
          </a>
          <button
            className="icon-button"
            aria-label={t(dark ? 'ui.themeLightAction' : 'ui.themeDarkAction')}
            onClick={() => {
              setTheme(dark ? 'light' : 'dark');
            }}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <LanguageSwitcher />
        </nav>
      </header>
      {route === 'battle' ? (
        <main className="battle-page">
          <BattlePanel onClose={() => navigate('home')} />
        </main>
      ) : (
        <AccountPage key={route} user={user} mode={route} onUser={setUser} onNavigate={navigate} />
      )}
    </div>
  );
}
