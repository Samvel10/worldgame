import {
  Check,
  ChevronRight,
  SlidersHorizontal,
  Leaf,
  Layers,
  Flame,
  Gem,
  Info,
} from 'lucide-react';
import { answers } from '../data/dictionary';
import { filterAnswers, letters, levels } from '../game/engine';
import type { Difficulty, Mode, Settings } from '../game/types';
import { useI18n } from '../i18n';
const icons = { easy: Leaf, medium: Layers, hard: Flame, expert: Gem, custom: SlidersHorizontal };
export function SettingsPanel({
  settings,
  onChange,
  onStart,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onStart: () => void;
}) {
  const { t } = useI18n();
  const pool = filterAnswers(
    settings.mode === 'custom' ? settings.difficulty : settings.mode,
    settings.mode === 'custom' ? settings.length : undefined,
  );
  const lengths = [...new Set(answers.map((x) => letters(x.word).length))].sort((a, b) => a - b);
  return (
    <aside className="settings-panel">
      <div className="section-eyebrow">{t('ui.yourGame')}</div>
      <h2>{t('ui.chooseChallenge')}</h2>
      <p className="muted panel-intro">{t('ui.smallSteps')}</p>
      <div className="levels" role="group" aria-label={t('ui.difficulty')}>
        {(Object.keys(levels) as Mode[]).map((mode) => {
          const Icon = icons[mode];
          return (
            <button
              key={mode}
              className={`level ${settings.mode === mode ? 'selected' : ''}`}
              aria-pressed={settings.mode === mode}
              onClick={() => onChange({ ...settings, mode })}
            >
              <span className="level-icon">
                <Icon size={20} />
              </span>
              <span>
                <strong>
                  <span className={mode === 'custom' ? 'desktop-label' : undefined}>
                    {t(`modes.${mode}`)}
                  </span>
                  {mode === 'custom' && <span className="mobile-label">{t('modes.custom')}</span>}
                </strong>
                <small>{t(`modeDescriptions.${mode}`)}</small>
              </span>
              {settings.mode === mode ? (
                <Check size={18} />
              ) : (
                <ChevronRight className="level-chevron" size={16} />
              )}
            </button>
          );
        })}
      </div>
      {settings.mode === 'custom' && (
        <div className="custom-settings">
          <h3>{t('ui.customSettings')}</h3>
          <label>
            {t('ui.wordLength')}
            <select
              value={settings.length}
              onChange={(e) => onChange({ ...settings, length: Number(e.target.value) })}
            >
              {lengths.map((n) => (
                <option key={n} value={n}>
                  {t('ui.letterWord', { count: n })}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('ui.attemptCount')}
            <select
              value={settings.attempts}
              onChange={(e) => onChange({ ...settings, attempts: Number(e.target.value) })}
            >
              {Array.from({ length: 10 }, (_, i) => i + 3).map((n) => (
                <option key={n} value={n}>
                  {n} {t('resultDialog.attempts')}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('ui.difficulty')}
            <select
              value={settings.difficulty}
              onChange={(e) =>
                onChange({ ...settings, difficulty: e.target.value as Difficulty | 'all' })
              }
            >
              <option value="all">{t('ui.all')}</option>
              {(['easy', 'medium', 'hard', 'expert'] as const).map((l) => (
                <option key={l} value={l}>
                  {t(`modes.${l}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className={`pool-note ${!pool.length ? 'pool-empty' : ''}`} role="status">
        <Info size={15} />
        <span>{pool.length ? t('ui.possible', { count: pool.length }) : t('ui.none')}</span>
      </div>
      <button className="primary start-button" disabled={!pool.length} onClick={onStart}>
        {t('startGame')} <ChevronRight size={18} />
      </button>
      <p className="settings-footnote">{t('ui.applyNote')}</p>
      <div className="side-note">
        <span className="note-line" />
        <h3>{t('ui.sideTitle')}</h3>
        <p>{t('ui.sideText')}</p>
      </div>
    </aside>
  );
}
