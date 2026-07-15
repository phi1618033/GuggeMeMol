import { useTranslation, LANGUAGES } from '../i18n/I18nContext';

export default function LanguageSelector() {
  const { lang, setLang, t } = useTranslation();

  return (
    <div className="lang-selector">
      {LANGUAGES.map(({ code, flag }) => (
        <button
          key={code}
          className={`lang-btn ${lang === code ? 'active' : ''}`}
          onClick={() => setLang(code)}
          title={t(`lang.${code}`)}
          aria-label={t(`lang.${code}`)}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
