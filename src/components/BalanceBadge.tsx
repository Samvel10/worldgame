import { Coins } from 'lucide-react';
import { useI18n } from '../i18n';

export function BalanceBadge({ balance }: { balance: number }) {
  const { t, language } = useI18n();
  const amount = balance.toLocaleString(language === 'hy' ? 'hy-AM' : language);
  return (
    <span
      className="balance-badge"
      title={t('account.balance')}
      aria-label={t('account.kopecks', { count: amount })}
    >
      <Coins size={16} aria-hidden="true" />
      <span className="balance-badge-value">{amount}</span>
      <span className="balance-badge-unit">{t('account.kopeckUnit')}</span>
    </span>
  );
}
