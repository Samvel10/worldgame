import { useI18n } from '../i18n';
import type { CSSProperties } from 'react';
import { evaluateGuess, letters } from '../game/engine';
import type { Round, Status } from '../game/types';
import { markSymbols } from '../game/presentation';
export function Board({
  round,
  draft,
  status,
  errorId,
}: {
  round: Round;
  draft: string;
  status: Status;
  errorId: number;
}) {
  const { t } = useI18n();
  const length = letters(round.answer.word).length;
  return (
    <div
      className={`board ${length > 10 ? 'long-board' : ''} ${status === 'won' ? 'celebrate' : ''}`}
      style={
        {
          '--letters': length,
          '--tile-size': length > 15 ? '30px' : length > 10 ? '38px' : '53px',
        } as CSSProperties
      }
      role="group"
      aria-label={t('account.boardLabel',{length,attempts:round.attempts})}
    >
      {Array.from({ length: round.attempts }, (_, row) => {
        const guess = round.guesses[row];
        const current = row === round.guesses.length && status === 'playing';
        const chars = letters(guess ?? (current ? draft : ''));
        const marks = guess ? evaluateGuess(guess, round.answer.word) : undefined;
        return (
          <div
            className={`tile-row ${current ? 'current' : ''} ${current && errorId ? 'shake' : ''}`}
            key={`${row}-${current ? errorId : 'done'}`}
            role="group"
            aria-label={`${t('ui.round', { current: row + 1, total: round.attempts })}${guess ? `: ${guess}` : ''}`}
          >
            {Array.from({ length }, (_, col) => {
              const mark = marks?.[col];
              const hinted = Boolean(current && !chars[col] && round.revealed?.[col]);
              const glyph = chars[col] || (hinted ? round.revealed[col] : '');
              return (
                <div
                  className={`tile ${mark ?? 'neutral'} ${glyph ? 'filled' : ''} ${guess ? 'reveal' : ''} ${hinted ? 'hint-revealed' : ''}`}
                  style={{ '--delay': `${Math.min(col * 65, 700)}ms` } as CSSProperties}
                  key={col}
                  role="img"
                  aria-label={`${col + 1}՝ ${glyph || t('account.emptyTile')}${mark ? `՝ ${t(`helpContent.${mark}`)}` : ''}${hinted ? `՝ ${t('hints.revealedTile')}` : ''}`}
                >
                  <span key={glyph}>{glyph}</span>
                  {mark && <small aria-hidden="true">{markSymbols[mark]}</small>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
