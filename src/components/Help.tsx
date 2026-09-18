import { markSymbols } from '../game/presentation';
import type { Mark } from '../game/types';
import { useI18n } from '../i18n';
export function Help() {
  const { t } = useI18n();
  const examples = [
    ['բ', t('helpContent.correctExample'), t('helpContent.correctText')],
    ['ա', t('helpContent.presentExample'), t('helpContent.presentText')],
    ['ռ', t('helpContent.absentExample'), t('helpContent.absentText')],
  ] as const;
  return (
    <div className="help">
      <p>{t('helpContent.intro')}</p>
      {(['correct', 'present', 'absent'] as Mark[]).map((mark, i) => (
        <div className="help-example" key={mark}>
          <div className={`tile ${mark}`}>
            {examples[i][0]}
            <small aria-hidden="true">{markSymbols[mark]}</small>
          </div>
          <span>
            <strong>{t(`helpContent.${mark}`)}</strong>
            <small>{examples[i][2]}</small>
          </span>
        </div>
      ))}
      <h3>{t('helpContent.rulesTitle')}</h3>
      <ul>
        <li>{t('helpContent.ruleDictionary')}</li>
        <li>{t('helpContent.ruleEv')}</li>
        <li>{t('helpContent.ruleDuplicates')}</li>
        <li>{t('helpContent.ruleKeyboard')}</li>
        <li>{t('helpContent.ruleHint')}</li>
        <li>{t('helpContent.rulePaidHints')}</li>
        <li>{t('helpContent.ruleStats')}</li>
      </ul>
      <p className="source-note">
        {t('helpContent.sourcePrefix')}{' '}
        <a href="https://github.com/martakert/hyspell" target="_blank" rel="noreferrer">
          Hyspell (CC0)
        </a>
        {t('helpContent.sourceSuffix')}
      </p>
    </div>
  );
}
