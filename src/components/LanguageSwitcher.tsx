import { useEffect, useRef, useState } from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../i18n';
import type { LanguageCode } from '../i18n/translations';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const languages: { code: LanguageCode; label: string }[] = [
    { code: 'hy', label: 'Հայերեն' },
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
  ];

  const handleLanguageSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div ref={root} className="language-switcher">
      <button
        className="language-switcher-button"
        title={t('language')}
        aria-label={t('language')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <Globe size={20} />
      </button>
      {isOpen && (
        <div className="language-menu" role="menu">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-option ${language === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageSelect(lang.code)}
              aria-pressed={language === lang.code}
              role="menuitemradio"
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
