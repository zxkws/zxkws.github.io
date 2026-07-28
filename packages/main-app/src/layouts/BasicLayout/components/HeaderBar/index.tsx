import { useEffect, useState } from 'react';
import SafeAppLink from '../../../../components/SafeAppLink';
import { useUser } from '../../../../context/UserContext';
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
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.4 2 5 13.2h6.2L10.6 22 19 10.8h-6.2L13.4 2Z" />
    </svg>
  </span>
);

const HeaderBar = ({ isMobile, isPortal, onMenuToggle }: HeaderBarProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const { user, clearUser } = useUser();

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
      setBackendInfo({ deploymentTime: '获取失败' });
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
              <button className={styles.iconButton} onClick={onMenuToggle} type="button" aria-label="打开工作台菜单">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            )}

            <SafeAppLink className={styles.brand} to="/">
              <BrandMark />
              <span>ZXKWS</span>
            </SafeAppLink>

            {isPortal ? (
              <nav className={styles.portalNav} aria-label="门户导航">
                <a href="#tools">公开工具</a>
                <a href="#workspace">工作台</a>
                <a href="#links">导航收藏</a>
              </nav>
            ) : (
              <span className={styles.workspaceLabel}>Workspace</span>
            )}
          </div>

          <div className={styles.actions}>
            <button className={styles.commandButton} onClick={openCommandPalette} type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6" />
                <path d="m16 16 4 4" />
              </svg>
              <span>搜索</span>
              <kbd>⌘ K</kbd>
            </button>

            <button
              className={styles.iconButton}
              onClick={toggleTheme}
              type="button"
              aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
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
                      个人资料
                    </SafeAppLink>
                    <button onClick={handleOpenAbout} className={styles.menuItem} type="button" role="menuitem">
                      关于系统
                    </button>
                    <button onClick={handleClearCaches} className={styles.menuItem} type="button" role="menuitem">
                      清理缓存
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`${styles.menuItem} ${styles.dangerItem}`}
                      type="button"
                      role="menuitem"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <a className={styles.loginButton} href={buildLoginHref()}>
                登录后台
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
          aria-label="关于系统"
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
                <h2>关于系统</h2>
              </div>
              <button
                className={styles.iconButton}
                onClick={() => setIsAboutOpen(false)}
                type="button"
                aria-label="关闭"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <dl className={styles.infoList}>
              <div>
                <dt>前端构建时间</dt>
                <dd>{(process.env as Record<string, string | undefined>).BUILD_TIME}</dd>
              </div>
              <div>
                <dt>后端部署时间</dt>
                <dd>{backendInfo ? backendInfo.deploymentTime : '加载中...'}</dd>
              </div>
              <div>
                <dt>系统版本</dt>
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
