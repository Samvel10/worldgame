import type { Stats } from '../game/types';
import { useI18n } from '../i18n';
export function Statistics({ stats, onReset }: { stats: Stats; onReset: () => void }) {
  const { t } = useI18n();
  const max = Math.max(1, ...Object.values(stats.distribution));
  return (
    <>
      <div className="stat-grid">
        {[
          [stats.played, t('statistics.played')],
          [
            `${stats.played ? Math.round((stats.wins / stats.played) * 100) : 0}%`,
            t('statistics.wins'),
          ],
          [stats.streak, t('statistics.streak')],
          [stats.bestStreak, t('statistics.bestStreak')],
        ].map(([n, label]) => (
          <div key={label}>
            <strong>{n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <h3>{t('statistics.distribution')}</h3>
      <p className="muted">{t('statistics.distributionHint')}</p>
      <div className="distribution">
        {Array.from(
          { length: Math.max(7, ...Object.keys(stats.distribution).map(Number)) },
          (_, i) => i + 1,
        ).map((n) => (
          <div className="distribution-row" key={n}>
            <span>{n}</span>
            <div className="bar-track">
              <div
                className={`bar ${(stats.distribution[n] ?? 0) > 0 ? 'has-wins' : ''}`}
                style={{ width: `${Math.max(9, ((stats.distribution[n] ?? 0) / max) * 100)}%` }}
              >
                {stats.distribution[n] ?? 0}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="text-button danger" onClick={onReset}>
        {t('statistics.reset')}
      </button>
    </>
  );
}
