import ReactDOM from 'react-dom/client';
import '@fontsource/noto-sans-armenian/400.css';
import '@fontsource/noto-sans-armenian/500.css';
import '@fontsource/noto-sans-armenian/600.css';
import '@fontsource/noto-sans-armenian/700.css';
import App from './App';
import { I18nProvider } from './i18n';
import { initializeDictionary } from './data/dictionary';
import dictionaryUrl from './data/accepted.json?url';
import './styles.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);
async function boot() {
  root.render(
    <main className="loading-screen" role="status">
      <span className="brand-mark">բ</span>
      <h1>Բառիկ</h1>
      <p>Բառարանը պատրաստվում է…</p>
    </main>,
  );
  try {
    const response = await fetch(dictionaryUrl);
    if (!response.ok) throw new Error('Dictionary request failed');
    initializeDictionary(await response.json());
    root.render(
      <I18nProvider defaultLanguage="hy">
        <App />
      </I18nProvider>,
    );
  } catch {
    root.render(
      <main className="loading-screen">
        <span className="brand-mark">բ</span>
        <h1>Բառարանը չհաջողվեց բեռնել</h1>
        <p role="alert">Ստուգիր կապը և կրկին փորձիր։</p>
        <button className="primary" onClick={() => void boot()}>
          Կրկին փորձել
        </button>
      </main>,
    );
  }
}
void boot();
if ('serviceWorker' in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register('/sw.js').catch(() => undefined);
