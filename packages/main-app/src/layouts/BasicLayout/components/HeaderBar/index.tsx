import { useEffect, useState } from 'react';
import LightSpaceMark from '../../../../components/LightSpaceMark';
import SafeAppLink from '../../../../components/SafeAppLink';
import { useUser } from '../../../../context/UserContext';
import { useLanguage } from '../../../../i18n';
import { client as httpClient } from '../../../../services/httpClient';
import { clearAuthArtifacts } from '../../../../utils/authCleanup';
import { clearPwaCachesAndReload } from '../../../../utils/pwa';
import * as styles from './index.module.css';

type HeaderBarProps = {
  isMobile?: boolean;
  isPortal?: boolean;
  onMenuToggle?: () => void;
};

type BackendInfo = {
  deploymentTime?: string;
  version?: string;
};

const readEffectiveTheme = (): 'light' | 'dark' => {
  if (typeof document === 'undefined') return 'light';
  const root = document.documentElement;
  return root.getAttribute('data-theme') === 'dark' || root.classList.contains('dark') ? 'dark' : 'light';
};

const applyTheme = (next: 'light' | 'dark') => {
  const root = document.documentElement;
  root.setAttribute('data-theme', next);
  root.classList.toggle('dark', next === 'dark');
  localStorage.setItem('main-app-theme', next);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'dark' ? '#151515' : '#ffffff');
};

const buildLoginHref = () => {
  if (typeof window === 'undefined') return '/auth-app/#/login';
  const authBase =
    process.env.NODE_ENV === 'development' ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
  return `${authBase}/#/login?redirect=${encodeURIComponent(window.location.href)}`;
};

const BrandMark = () => (
  <span className={styles.brandMark} aria-hidden="true">
    <LightSpaceMark />
  </span>
);

const HeaderBar = ({ isMobile, isPortal, onMenuToggle }: HeaderBarProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const { user, clearUser } = useUser();
  const { language, t, toggleLanguage } = useLanguage();

  useEffect(() => {
    setTheme(readEffectiveTheme());
    const observer = new MutationObserver(() => setTheme(readEffectiveTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = readEffectiveTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  const handleLogout = async () => {
    try {
      await httpClient('/auth/logout', {}, { method: 'POST' });
    } catch (error) {
      console.error('Failed to logout', error);
    } finally {
      clearAuthArtifacts();
      clearUser();
    }
  };

  const handleClearCaches = () => {
    setIsMenuOpen(false);
    void clearPwaCachesAndReload();
  };

  const handleOpenAbout = async () => {
    setIsMenuOpen(false);
    setIsAboutOpen(true);
    setBackendInfo(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await httpClient<unknown>('/app/about', null, {
        method: 'GET',
        headers: { 'x-timezone': timezone },
      });

      if (response && typeof response === 'object') {
        const record = response as Record<string, unknown>;
        if (record.data && typeof record.data === 'object') {
          setBackendInfo(record.data as BackendInfo);
        } else {
          setBackendInfo(record as BackendInfo);
        }
      } else {
        setBackendInfo({});
      }
    } catch (error) {
      console.error('Failed to fetch backend info', error);
      setBackendInfo({ deploymentTime: t('header.fetchFailed') });
    }
  };

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('main-app:open-command-palette'));
  };

  return (
    <>
      <header className={styles.headerBar}>
        <div className={styles.headerInner}>
          <div className={styles.leftArea}>
            {isMobile && !isPortal && (
              <button
                className={styles.iconButton}
                onClick={onMenuToggle}
                type="button"
                aria-label={t('header.openMenu')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            )}

            <SafeAppLink className={styles.brand} to="/">
              <BrandMark />
              <span className={styles.brandWords}>
                <strong>光域</strong>
                <small>LIGHTSPACE</small>
              </span>
            </SafeAppLink>

            {!isPortal && <span className={styles.workspaceLabel}>LightSpace Console</span>}
          </div>

          <div className={styles.actions}>
            <button className={styles.commandButton} onClick={openCommandPalette} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4" />
              </svg>
              <span>{t('header.search')}</span>
              <kbd>⌘ K</kbd>
            </button>

            <button
              className={`${styles.iconButton} ${styles.languageButton}`}
              onClick={toggleLanguage}
              type="button"
              aria-label={language === 'zh-CN' ? t('header.switchToEnglish') : t('header.switchToChinese')}
              title={language === 'zh-CN' ? t('header.switchToEnglish') : t('header.switchToChinese')}
            >
              {language === 'zh-CN' ? 'EN' : '中'}
            </button>

            <button
              className={styles.iconButton}
              onClick={toggleTheme}
              type="button"
              aria-label={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" />
                </svg>
              )}
            </button>

            {user ? (
              <div className={styles.userProfile}>
                <button
                  className={styles.userButton}
                  onClick={() => setIsMenuOpen((open) => !open)}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                >
                  {user.avatar ? (
                    <img src={user.avatar} className={styles.avatar} alt="" />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden="true">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M5 21a7 7 0 0 1 14 0" />
                      </svg>
                    </span>
                  )}
                  <span className={styles.username}>{user.username}</span>
                  <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m8 10 4 4 4-4" />
                  </svg>
                </button>

                {isMenuOpen && (
                  <div className={styles.dropdown} onMouseLeave={() => setIsMenuOpen(false)} role="menu">
                    <SafeAppLink to="/profile" className={styles.menuItem} role="menuitem">
                      {t('header.profile')}
                    </SafeAppLink>
                    <button onClick={handleOpenAbout} className={styles.menuItem} type="button" role="menuitem">
                      {t('header.about')}
                    </button>
                    <button onClick={handleClearCaches} className={styles.menuItem} type="button" role="menuitem">
                      {t('header.clearCache')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`${styles.menuItem} ${styles.dangerItem}`}
                      type="button"
                      role="menuitem"
                    >
                      {t('header.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a className={styles.loginButton} href={buildLoginHref()}>
                {t('header.loginAdmin')}
              </a>
            )}
          </div>
        </div>
      </header>

      {isAboutOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsAboutOpen(false)}
          onKeyDown={(event) => event.key === 'Escape' && setIsAboutOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t('header.about')}
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            role="document"
          >
            <div className={styles.modalHeading}>
              <div>
                <span className={styles.eyebrow}>SYSTEM INFO</span>
                <h2>{t('header.about')}</h2>
              </div>
              <button
                className={styles.iconButton}
                onClick={() => setIsAboutOpen(false)}
                type="button"
                aria-label={t('common.close')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <dl className={styles.infoList}>
              <div>
                <dt>{t('header.frontendBuildTime')}</dt>
                <dd>{(process.env as Record<string, string | undefined>).BUILD_TIME}</dd>
              </div>
              <div>
                <dt>{t('header.backendDeployTime')}</dt>
                <dd>{backendInfo ? backendInfo.deploymentTime : t('common.loading')}</dd>
              </div>
              <div>
                <dt>{t('header.systemVersion')}</dt>
                <dd>{backendInfo?.version}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </>
  );
};

export default HeaderBar;
