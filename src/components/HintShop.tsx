import { Eye, Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
import { KopeckCoin } from './BalanceBadge';
import { useI18n } from '../i18n';
import { HINT_COSTS } from '../../shared/economy.mjs';
import type { Account } from './AccountPage';

type HintKind = keyof typeof HINT_COSTS;

export function HintShop({
  account,
  balance,
  busy,
  canLetter,
  canClue,
  canSkip,
  onBuy,
  onLogin,
}: {
  account: Account | null | undefined;
  balance: number;
  busy: boolean;
  canLetter: boolean;
  canClue: boolean;
  canSkip: boolean;
  onBuy: (kind: HintKind) => void;
  onLogin: () => void;
}) {
  const { t } = useI18n();
  const items: {
    kind: HintKind;
    icon: typeof Eye;
    title: string;
    text: string;
    enabled: boolean;
  }[] = [
    {
      kind: 'letter',
      icon: Eye,
      title: t('hints.letterTitle'),
      text: t('hints.letterText'),
      enabled: canLetter,
    },
    {
      kind: 'clue',
      icon: Lightbulb,
      title: t('hints.clueTitle'),
      text: t('hints.clueText'),
      enabled: canClue,
    },
    {
      kind: 'skip',
      icon: RefreshCw,
      title: t('hints.skipTitle'),
      text: t('hints.skipText'),
      enabled: canSkip,
    },
  ];

  return (
    <section className="hint-shop" aria-label={t('hints.shopLabel')}>
      <div className="hint-shop-head">
        <Sparkles size={18} aria-hidden="true" />
        <div>
          <h2>{t('hints.shopTitle')}</h2>
          <p>{t('hints.shopSubtitle')}</p>
        </div>
      </div>
      {!account && (
        <button type="button" className="hint-login" onClick={onLogin}>
          {t('hints.needAccount')}
        </button>
      )}
      <div className="hint-shop-grid">
        {items.map((item) => {
          const cost = HINT_COSTS[item.kind];
          const affordable = Boolean(account) && balance >= cost;
          const disabled = busy || !account || !item.enabled || !affordable;
          const Icon = item.icon;
          return (
            <button
              key={item.kind}
              type="button"
              className={`hint-card hint-card-${item.kind}`}
              disabled={disabled}
              onClick={() => onBuy(item.kind)}
            >
              <span className="hint-card-icon">
                <Icon size={20} />
              </span>
              <span className="hint-card-body">
                <strong>{item.title}</strong>
                <small>{item.text}</small>
              </span>
              <span className="hint-card-cost">
                <KopeckCoin size={18} />
                <span>{cost}</span>
              </span>
            </button>
          );
        })}
      </div>
      {account && balance < HINT_COSTS.letter && (
        <p className="hint-shop-note">{t('hints.lowBalance')}</p>
      )}
    </section>
  );
}
