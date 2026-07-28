import LightSpaceMark from '../../components/LightSpaceMark';
import SafeAppLink from '../../components/SafeAppLink';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../i18n';
import * as styles from './index.module.css';

const buildLoginHref = () => {
  if (typeof window === 'undefined') return '/auth-app/#/login';
  const authBase =
    process.env.NODE_ENV === 'development' ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
  return `${authBase}/#/login?redirect=${encodeURIComponent(window.location.href)}`;
};

const Arrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M14 7l5 5-5 5" />
  </svg>
);

export default function NavHome() {
  const { user } = useUser();
  const { t } = useLanguage();

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <span className={styles.mark} aria-hidden="true">
          <LightSpaceMark />
        </span>
        <p className={styles.eyebrow}>LIGHTSPACE</p>
        <h1>光域</h1>
        <p className={styles.description}>{t('home.description')}</p>

        <div className={styles.actions}>
          {user ? (
            <SafeAppLink className={styles.primaryButton} to="/app/agent-platform">
              {t('home.enter')}
              <Arrow />
            </SafeAppLink>
          ) : (
            <a className={styles.primaryButton} href={buildLoginHref()}>
              {t('home.login')}
              <Arrow />
            </a>
          )}
        </div>
      </section>

      <footer className={styles.footer}>PERSONAL DIGITAL SPACE</footer>
    </main>
  );
}
