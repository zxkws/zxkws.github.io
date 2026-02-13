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

type BackendInfo = {
  deploymentTime?: string;
  version?: string;
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

const formatLocalTime = (isoString: string | undefined) => {
  if (!isoString || isoString === 'Unknown') return isoString;
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch (_e) {
    return isoString;
  }
};

const HeaderBar = ({ isMobile, onMenuToggle }: HeaderBarProps) => {
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
    await httpClient('/auth/logout', {}, { method: 'POST' });
    clearAuthArtifacts();
    clearUser();
  };

  const handleClearCaches = () => {
    setIsMenuOpen(false);
    void clearPwaCachesAndReload();
  };

  const handleOpenAbout = async () => {
    setIsMenuOpen(false);
    setIsAboutOpen(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await httpClient<any>('/app/about', null, {
        method: 'GET',
        headers: { 'x-timezone': timezone },
      });

      let info: BackendInfo = {};
      if (res && typeof res === 'object') {
        if (res.data && typeof res.data === 'object' && 'deploymentTime' in res.data) {
          info = res.data;
        } else if (res.code === 200 && res.data) {
          info = res.data;
        } else {
          info = res as BackendInfo;
        }
      }
      setBackendInfo(info);
    } catch (e) {
      console.error('Failed to fetch backend info', e);
      setBackendInfo({ deploymentTime: '获取失败' });
    }
  };

  if (!user) return null;

  return (
    <header className={styles.headerBar}>
      <div className={styles.leftArea}>
        {isMobile && (
          <button className={styles.menuToggle} onClick={onMenuToggle} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <title>Toggle Menu</title>
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.themeBtn} onClick={toggleTheme} type="button" aria-label="Toggle Theme">
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>

        <div className={styles.userProfile}>
          <button className={styles.userBtn} onClick={() => setIsMenuOpen(!isMenuOpen)} type="button">
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64'}
              className={styles.avatar}
              alt="User Avatar"
            />
            <span className={styles.username}>{user.username}</span>
          </button>

          {isMenuOpen && (
            <div className={styles.dropdown} onMouseLeave={() => setIsMenuOpen(false)} role="menu">
              <a href="/profile" className={styles.menuItem} role="menuitem">
                个人资料
              </a>
              <button onClick={handleOpenAbout} className={styles.menuItem} type="button" role="menuitem">
                关于
              </button>
              <button onClick={handleClearCaches} className={styles.menuItem} type="button" role="menuitem">
                清理缓存
              </button>
              <button onClick={handleLogout} className={styles.menuItem} type="button" role="menuitem">
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      {isAboutOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setIsAboutOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsAboutOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[var(--card-bg)] border border-[var(--color-divider)] rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
          >
            <h3 className="text-xl font-bold mb-4">关于系统</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-semibold text-[var(--color-primary)]">前端构建时间</div>
                <div className="opacity-80">{formatLocalTime((process.env as any).BUILD_TIME) || 'Unknown'}</div>
              </div>
              <div>
                <div className="font-semibold text-[var(--color-primary)]">后端部署时间</div>
                <div className="opacity-80">{backendInfo?.deploymentTime || '加载中...'}</div>
              </div>
              <div className="pt-2 border-t border-[var(--color-divider)] flex justify-between opacity-60">
                <span>系统版本</span>
                <span className="font-mono">{backendInfo?.version || '1.0.0'}</span>
              </div>
            </div>
            <button
              onClick={() => setIsAboutOpen(false)}
              className="mt-6 w-full py-2 bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90 transition-opacity"
              type="button"
            >
              确定
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default HeaderBar;
