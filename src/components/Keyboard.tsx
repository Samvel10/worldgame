import { CornerDownLeft, Delete } from 'lucide-react';
import type { KeyboardState } from '../game/types';
import { markSymbols } from '../game/presentation';
import { useI18n } from '../i18n';
const rows = [
  ['է', 'թ', 'փ', 'ձ', 'ջ', 'ր', 'չ', 'ճ', 'ժ', 'ծ'],
  ['ք', 'ո', 'ե', 'ռ', 'տ', 'ը', 'ւ', 'ի', 'օ', 'պ'],
  ['ա', 'ս', 'դ', 'ֆ', 'գ', 'հ', 'յ', 'կ', 'լ', 'շ'],
  ['զ', 'ղ', 'ց', 'վ', 'բ', 'ն', 'մ', 'ու', 'և'],
];
export function Keyboard({
  state,
  onKey,
  disabled,
}: {
  state: KeyboardState;
  onKey: (key: string) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="keyboard" role="group" aria-label={t('ui.keyboardLabel')}>
      {rows.map((row, i) => (
        <div className="key-row" key={i}>
          {row.map((letter) => (
            <button
              key={letter}
              type="button"
              className={`key ${state[letter] ?? ''}`}
              aria-label={`${letter}${state[letter] ? `՝ ${t(`helpContent.${state[letter]}`)}` : ''}`}
              disabled={disabled}
              onClick={() => onKey(letter)}
            >
              {letter}
              {state[letter] && <small aria-hidden="true">{markSymbols[state[letter]]}</small>}
            </button>
          ))}
        </div>
      ))}
      <div className="key-row keyboard-actions">
        <button className="key enter-key" disabled={disabled} onClick={() => onKey('Enter')}>
          <CornerDownLeft size={16} /> {t('ui.check')} <kbd>Enter</kbd>
        </button>
        <button
          className="key delete-key"
          disabled={disabled}
          onClick={() => onKey('Backspace')}
          aria-label={t('ui.deleteLast')}
        >
          <Delete size={21} />
          <span>{t('ui.delete')}</span>
        </button>
      </div>
    </div>
  );
}
