import LightSpaceMark from '../../components/LightSpaceMark';
import SafeAppLink from '../../components/SafeAppLink';
import { useUser } from '../../context/UserContext';
import * as styles from './index.module.css';

const lightSpaceRepository = 'https://github.com/hqli2005/LightSpace';

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

const ExternalArrow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 5h5v5M19 5l-9 9M19 14v5H5V5h5" />
  </svg>
);

export default function NavHome() {
  const { user } = useUser();

  return (
    <main className={styles.home}>
      <section className={styles.hero}>
        <span className={styles.mark} aria-hidden="true">
          <LightSpaceMark />
        </span>
        <p className={styles.eyebrow}>LIGHTSPACE</p>
        <h1>光域</h1>
        <p className={styles.description}>一个属于创造、记录与探索的数字空间。</p>

        <div className={styles.actions}>
          {user ? (
            <SafeAppLink className={styles.primaryButton} to="/app/agent-platform">
              进入系统
              <Arrow />
            </SafeAppLink>
          ) : (
            <a className={styles.primaryButton} href={buildLoginHref()}>
              登录系统
              <Arrow />
            </a>
          )}
          <a className={styles.secondaryButton} href={lightSpaceRepository} target="_blank" rel="noreferrer">
            GitHub
            <ExternalArrow />
          </a>
        </div>
      </section>

      <footer className={styles.footer}>PERSONAL DIGITAL SPACE</footer>
    </main>
  );
}
