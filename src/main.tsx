import ReactDOM from 'react-dom/client';
import '@fontsource/noto-sans-armenian/400.css';
import '@fontsource/noto-sans-armenian/500.css';
import '@fontsource/noto-sans-armenian/600.css';
import '@fontsource/noto-sans-armenian/700.css';
import Site from './Site';
import { I18nProvider } from './i18n';
import { initializeDictionary } from './data/dictionary';
import dictionaryUrl from './data/accepted.json?url';
import './styles.css';
import { getNestedValue } from './i18n/utils';

const root = ReactDOM.createRoot(document.getElementById('root')!);
async function boot() {
  let language: 'hy' | 'en' | 'ru' = 'hy';
  try {
    const saved = localStorage.getItem('language');
    if (saved === 'en' || saved === 'ru') language = saved;
  } catch {
    /* optional persistence */
  }
  const text = (key: string) => getNestedValue(language, key) ?? key;
  document.documentElement.lang = language;
  root.render(
    <main className="loading-screen" role="status">
      <span className="brand-mark">բ</span>
      <h1>{text('title')}</h1>
      <p>{text('errors.loadingDictionary')}</p>
    </main>,
  );
  try {
    const response = await fetch(dictionaryUrl);
    if (!response.ok) throw new Error('Dictionary request failed');
    initializeDictionary(await response.json());
    root.render(
      <I18nProvider defaultLanguage="hy">
        <Site />
      </I18nProvider>,
    );
  } catch {
    root.render(
      <main className="loading-screen">
        <span className="brand-mark">բ</span>
        <h1>{text('errors.dictionaryError')}</h1>
        <p role="alert">{text('account.errors.network')}</p>
        <button className="primary" onClick={() => void boot()}>
          {text('errors.retry')}
        </button>
      </main>,
    );
  }
}
void boot();
if ('serviceWorker' in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
