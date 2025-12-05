import { useEffect, useMemo, useState, type ReactNode } from 'react';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';
import { builtInAsideMenus } from './menuConfig';
import { fetchRemoteMenus } from '../../services/menuService';
import { createFetchClient } from '@zxkws/shared-fetch';

type BasicLayoutProps = {
  children: ReactNode;
  pathname?: string;
};

const NAV_STORAGE_KEY = 'main-app-nav-collapsed';
const NAV_URL_PARAM = 'nav';

const parseNavParam = (value: string | null): boolean | null => {
  if (!value) return null;
  const lowered = value.toLowerCase();
  if (['1', 'true', 'collapsed', 'close', 'hide'].includes(lowered)) return true;
  if (['0', 'false', 'expanded', 'open', 'show'].includes(lowered)) return false;
  return null;
};

const readNavFromStorage = (): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(NAV_STORAGE_KEY);
    return parseNavParam(stored);
  } catch {
    return null;
  }
};

const writeNavToStorage = (collapsed: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(NAV_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    // ignore
  }
};

const readNavFromUrl = (): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    return parseNavParam(url.searchParams.get(NAV_URL_PARAM));
  } catch {
    return null;
  }
};

const writeNavToUrl = (collapsed: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set(NAV_URL_PARAM, collapsed ? 'collapsed' : 'expanded');
    window.history.replaceState({}, '', url.toString());
  } catch {
    // ignore URL update failures
  }
};

const resolveInitialNavState = (): boolean => {
  const fromUrl = readNavFromUrl();
  if (fromUrl !== null) return fromUrl;
  const fromStorage = readNavFromStorage();
  if (fromStorage !== null) return fromStorage;
  return false;
};

const filterMenusByRole = (items: any[], isAdmin: boolean): any[] => {
  return items
    .map((item) => {
      if (item.adminOnly && !isAdmin) return null;
      const children = item.children ? filterMenusByRole(item.children, isAdmin) : undefined;
      return { ...item, children };
    })
    .filter(Boolean);
};

export default function BasicLayout({ children }: BasicLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState<boolean>(() => resolveInitialNavState());
  const [remoteMenus, setRemoteMenus] = useState(builtInAsideMenus);
  const [isAdmin, setIsAdmin] = useState(false);

  // 当 URL 发生前进/后退时，根据 nav 参数同步折叠状态
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => {
      const next = readNavFromUrl();
      if (next === null) return;
      setIsNavCollapsed(next);
      writeNavToStorage(next);
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return undefined;
    }

    const media = window.matchMedia('(max-width: 900px)');
    const apply = (matches: boolean) => {
      setIsMobile(matches);
      if (!matches) {
        // 桌面关闭抽屉态
        setIsNavOpen(false);
      }
    };

    apply(media.matches);

    const handler = (event: MediaQueryListEvent) => apply(event.matches);

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handler);
    } else if (typeof media.addListener === 'function') {
      media.addListener(handler);
    }

    return () => {
      if (typeof media.removeEventListener === 'function') {
        media.removeEventListener('change', handler);
      } else if (typeof media.removeListener === 'function') {
        media.removeListener(handler);
      }
    };
  }, []);

  const toggleNav = () => setIsNavOpen((open) => !open);
  const closeNav = () => setIsNavOpen(false);
  const toggleDesktopNav = () => {
    if (isMobile) return; // 移动端不做折叠
    setIsNavCollapsed((prev) => {
      const next = !prev;
      writeNavToStorage(next);
      writeNavToUrl(next);
      return next;
    });
  };

  // 初始同步一次 URL（如果来自 storage），保持可分享性
  useEffect(() => {
    writeNavToUrl(isNavCollapsed);
  }, [isNavCollapsed]);

  useEffect(() => {
    const client = createFetchClient({
      baseURL: process.env.NODE_ENV === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api',
      getToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('auth_token')),
      credentials: 'include',
    });
    client('/v1/user', undefined, { method: 'GET' })
      .then((res: any) => {
        const data = res?.data ?? res;
        setIsAdmin(data?.role === 'admin');
      })
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchRemoteMenus()
      .then((res) => {
        if (!mounted) return;
        const merged = [...builtInAsideMenus, ...res]
          .filter((item) => item.visible !== false)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setRemoteMenus(merged);
      })
      .catch(() => {
        setRemoteMenus(builtInAsideMenus);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const menus = useMemo(() => filterMenusByRole(remoteMenus, isAdmin), [remoteMenus, isAdmin]);

  const shouldShowNav = isMobile || !isNavCollapsed;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300">
      <HeaderBar
        isMobile={isMobile}
        isNavOpen={isNavOpen}
        onMenuToggle={toggleNav}
        onDesktopNavToggle={toggleDesktopNav}
        isNavCollapsed={isNavCollapsed}
      />
      <div className="flex flex-1 overflow-hidden">
        {shouldShowNav && <PageNav isMobile={isMobile} isOpen={isNavOpen} onClose={closeNav} menus={menus} />}
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden px-8 py-10" aria-hidden={isMobile && isNavOpen}>
          {children}
        </main>
      </div>
    </div>
  );
}
