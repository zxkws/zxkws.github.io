import { useEffect, useMemo, useState } from 'react';
import * as styles from './index.module.css';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'main-app-theme';
const THEME_ATTRIBUTE = 'data-theme';

const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark';

const readStoredTheme = (): Theme | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
};

const systemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const resolveInitialTheme = (): Theme => {
  if (typeof document !== 'undefined') {
    const attrTheme = document.documentElement.getAttribute(THEME_ATTRIBUTE);
    if (isTheme(attrTheme)) {
      return attrTheme;
    }
  }
  return readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light');
};

const applyTheme = (nextTheme: Theme) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute(THEME_ATTRIBUTE, nextTheme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // ignore storage failures (e.g. private mode)
  }
};

const SunIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
    <path
      fill="currentColor"
      d="M12 5.25a.75.75 0 0 1-.75-.75V2.5a.75.75 0 0 1 1.5 0V4.5a.75.75 0 0 1-.75.75Zm0 16.25a.75.75 0 0 1-.75-.75V19.5a.75.75 0 0 1 1.5 0v1.25a.75.75 0 0 1-.75.75Zm9-8.5a.75.75 0 0 1-.75.75H19a.75.75 0 0 1 0-1.5h1.25a.75.75 0 0 1 .75.75ZM5.75 12a.75.75 0 0 1-.75.75H3.75a.75.75 0 0 1 0-1.5H5a.75.75 0 0 1 .75.75Zm12.15 6.1a.75.75 0 0 1-1.06-1.06l.88-.88a.75.75 0 0 1 1.06 1.06l-.88.88Zm-11.78-11.8a.75.75 0 0 1-1.06-1.06l.88-.88a.75.75 0 0 1 1.06 1.06l-.88.88Zm11.78 0-.88-.88a.75.75 0 0 1 1.06-1.06l.88.88a.75.75 0 0 1-1.06 1.06Zm-11.78 11.8-.88-.88a.75.75 0 1 1 1.06-1.06l.88.88a.75.75 0 0 1-1.06 1.06ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.icon}>
    <path
      fill="currentColor"
      d="M12.5 2a.75.75 0 0 1 .74.62 8.75 8.75 0 0 0 8.14 7.13.75.75 0 0 1 .12 1.48A9.76 9.76 0 0 1 12 21.75 9.75 9.75 0 0 1 11.78 2.63 8.98 8.98 0 0 0 12.5 2Zm-2.72 2.39A8.25 8.25 0 1 0 19.61 14a10.26 10.26 0 0 1-9.83-9.61Z"
    />
  </svg>
);

type HeaderBarProps = {
  isMobile?: boolean;
  isNavOpen?: boolean;
  onMenuToggle?: () => void;
};

const HeaderBar = ({ isMobile = false, isNavOpen = false, onMenuToggle }: HeaderBarProps) => {
  const [theme, setTheme] = useState<Theme>(() => resolveInitialTheme());
  const [hasManualOverride, setHasManualOverride] = useState<boolean>(() => readStoredTheme() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (hasManualOverride) {
        return;
      }
      setTheme(event.matches ? 'dark' : 'light');
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handleChange);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', handleChange);
      } else if (typeof media.removeListener === 'function') {
        media.removeListener(handleChange);
      }
    };
  }, [hasManualOverride]);

  const toggleTheme = () => {
    setHasManualOverride(true);
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const nextThemeLabel = useMemo(() => (theme === 'dark' ? '切换至亮色' : '切换至暗色'), [theme]);
  const ThemeIcon = theme === 'dark' ? SunIcon : MoonIcon;

  return (
    <header className={styles.headerBar}>
      <div className={styles.brandArea}>
        {isMobile && (
          <button
            type="button"
            className={styles.menuButton}
            aria-label={isNavOpen ? '关闭导航' : '打开导航'}
            aria-expanded={isNavOpen}
            data-open={isNavOpen || undefined}
            onClick={onMenuToggle}
          >
            <span className={styles.menuIcon} aria-hidden="true" />
          </button>
        )}
        <div className={styles.brand} aria-label="ZXKWS 主应用">
          <span className={styles.brandMark}>ZXKWS</span>
          <span className={styles.brandTagline}>A Hub</span>
        </div>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.themeToggle}
          aria-label={nextThemeLabel}
          title={nextThemeLabel}
        >
          <span className={styles.themeIcon}>
            <ThemeIcon />
          </span>
          <span className={styles.themeText}>{theme === 'dark' ? '暗色模式' : '亮色模式'}</span>
        </button>
      </div>
    </header>
  );
};

export default HeaderBar;
