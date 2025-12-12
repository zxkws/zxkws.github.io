import { useEffect, useState } from 'react';
import { useUser } from '../../../../context/UserContext';
import { client as httpClient } from '../../../../services/httpClient';
import { clearAuthArtifacts } from '../../../../utils/authCleanup';
import * as styles from './index.module.css';

type HeaderBarProps = {
  isMobile?: boolean;
  onMenuToggle?: () => void;
};

const HeaderBar = ({ isMobile, onMenuToggle }: HeaderBarProps) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, clearUser } = useUser();

  useEffect(() => {
    // Initial Theme Sync
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(isDark ? 'dark' : 'light');

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          setTheme(isDark ? 'dark' : 'light');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('main-app-theme', next);
    setTheme(next);
  };

  const handleLogout = async () => {
    await httpClient('/auth/logout', {}, { method: 'POST' });
    clearAuthArtifacts();
    clearUser();
    window.location.reload();
  };

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
        <div className={styles.brand}>
          <div className={styles.brandIcon}>Z</div>
          <span>ZXKWS Hub</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.themeBtn} onClick={toggleTheme} aria-label="Toggle Theme" type="button">
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        {user ? (
          <div className={styles.userProfile}>
            <button className={styles.userBtn} onClick={() => setIsMenuOpen(!isMenuOpen)} type="button">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces"
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
                <button onClick={handleLogout} className={styles.menuItem} type="button" role="menuitem">
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className={styles.loginBtn}
            onClick={() => {
              window.location.href = 'https://zxkws.nyc.mn/auth-app/#/login';
            }}
            type="button"
          >
            登录
          </button>
        )}
      </div>
    </header>
  );
};

export default HeaderBar;
