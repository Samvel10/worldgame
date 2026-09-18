import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

export function KopeckCoin({ size = 22 }: { size?: number }) {
  return (
    <span
      className="kopeck-coin"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }}
      aria-hidden="true"
    >
      <span className="kopeck-coin-face">կ</span>
    </span>
  );
}

export function BalanceBadge({ balance }: { balance: number }) {
  const { t, language } = useI18n();
  const previous = useRef(balance);
  const [bump, setBump] = useState(false);
  const amount = balance.toLocaleString(language === 'hy' ? 'hy-AM' : language);
  useEffect(() => {
    if (balance > previous.current) {
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 1400);
      previous.current = balance;
      return () => window.clearTimeout(timer);
    }
    previous.current = balance;
  }, [balance]);
  return (
    <span
      className={`balance-badge${bump ? ' balance-badge-bump' : ''}`}
      title={t('account.balance')}
      aria-label={t('account.kopecks', { count: amount })}
    >
      <KopeckCoin size={20} />
      <span className="balance-badge-value">{amount}</span>
      <span className="balance-badge-unit">{t('account.kopeckUnit')}</span>
    </span>
  );
}

export function RewardBanner({ amount, label }: { amount: number; label: string }) {
  const { language } = useI18n();
  const shown = amount.toLocaleString(language === 'hy' ? 'hy-AM' : language);
  return (
    <div className="reward-banner" role="status">
      <KopeckCoin size={28} />
      <div>
        <strong>
          +{shown} {label}
        </strong>
      </div>
    </div>
  );
}
