import { useEffect, useState } from 'react';
import { useUser } from '../../../../context/UserContext';
import { client as httpClient } from '../../../../services/httpClient';
import { clearAuthArtifacts } from '../../../../utils/authCleanup';
import { clearPwaCachesAndReload } from '../../../../utils/pwa';
import * as styles from './index.module.css';

type HeaderBarProps = {
  isMobile?: boolean;
  onMenuToggle?: () => void;
};

const readEffectiveTheme = (): 'light' | 'dark' => {
  if (typeof document === 'undefined') return 'light';
  const root = document.documentElement;
  const isDarkAttr = root.getAttribute('data-theme') === 'dark';
  const isDarkClass = root.classList.contains('dark');
  return isDarkAttr || isDarkClass ? 'dark' : 'light';
};

const applyTheme = (next: 'light' | 'dark') => {
  const root = document.documentElement;
  root.setAttribute('data-theme', next);
  root.classList.toggle('dark', next === 'dark');
  localStorage.setItem('main-app-theme', next);
};

const HeaderBar = ({ isMobile, onMenuToggle }: HeaderBarProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, clearUser } = useUser();

  useEffect(() => {
    // Initial Theme Sync (support both `data-theme` and `html.dark` from micro-apps)
    setTheme(readEffectiveTheme());

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class')
        ) {
          setTheme(readEffectiveTheme());
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const current = readEffectiveTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  };

  const handleLogout = async () => {
    await httpClient('/auth/logout', {}, { method: 'POST' });
    clearAuthArtifacts();
    clearUser();
    // BasicLayout 的 useEffect 会捕捉到 user 为空，并执行跳转
  };

  const handleClearCaches = () => {
    setIsMenuOpen(false);
    void clearPwaCachesAndReload();
  };

  if (!user) return null;

  return (
    <header className={styles.headerBar}>
      <div className={styles.leftArea}>
        {isMobile && (
          <button className={styles.menuToggle} onClick={onMenuToggle} type="button">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-labelledby="menuIconTitle"
            >
              <title id="menuIconTitle">Menu</title>
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle Theme" type="button">
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        <div className={styles.userProfile}>
          <button className={styles.userBtn} onClick={() => setIsMenuOpen(!isMenuOpen)} type="button">
            <img
              src={
                user.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces'
              }
              className={styles.avatar}
              alt="User"
            />
            <span className={styles.username}>{user.username}</span>
          </button>

          {isMenuOpen && (
            <div className={styles.dropdown} onMouseLeave={() => setIsMenuOpen(false)} role="menu" tabIndex={-1}>
              <a href="/profile" className={styles.menuItem} role="menuitem">
                个人资料
              </a>
              <button onClick={handleClearCaches} className={styles.menuItem} type="button" role="menuitem">
                清理缓存并刷新
              </button>
              <button onClick={handleLogout} className={styles.menuItem} type="button" role="menuitem">
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderBar;
