import { type ReactNode, useEffect, useMemo, useState } from 'react';
import CommandPalette, { type CommandItem } from '../../components/CommandPalette';
import PageLoading from '../../components/PageLoading';
import { useUser } from '../../context/UserContext';
import { fetchRemoteMenus } from '../../services/menuService';
import type { MenuItem } from '../../types/menu';
import { clearPwaCachesAndReload } from '../../utils/pwa';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';
import { builtInAsideMenus } from './menuConfig';

export default function BasicLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const { user, loading } = useUser();
  const [menus, setMenus] = useState<MenuItem[]>(builtInAsideMenus);

  useEffect(() => {
    console.log('[BasicLayout] Current menus:', menus);
  }, [menus]);

  const isPublicRoute = (() => {
    if (typeof window === 'undefined') return true;
    const pathname = window.location.pathname || '/';
    // 兜底与注释保持一致：未登录可见主页与工具页；另外 Watch Together 需要可分享链接，默认公开。
    return (
      pathname === '/' ||
      pathname.startsWith('/tools/') ||
      pathname === '/app/watch-together' ||
      pathname === '/chess-mirror' ||
      pathname.startsWith('/chess-mirror/')
    );
  })();

  const commandItems = useMemo<CommandItem[]>(() => {
    const flatten = (items: MenuItem[], prefix: string[] = []) => {
      const out: CommandItem[] = [];
      items.forEach((item) => {
        const title = item.name || '';
        const path = item.path;
        const keywords = [...prefix, title].filter(Boolean);
        if (path) {
          out.push({
            id: `route:${path}`,
            title,
            subtitle: path,
            href: path,
            keywords,
          });
        }
        const children = item.children;
        if (children?.length) {
          out.push(...flatten(children, [...keywords]));
        }
      });
      return out;
    };

    const routes = flatten(menus);
    const actions: CommandItem[] = [
      {
        id: 'action:reload',
        title: '刷新页面',
        subtitle: 'window.location.reload()',
        action: () => window.location.reload(),
      },
      {
        id: 'action:clear-cache-reload',
        title: '清理缓存并刷新',
        subtitle: 'Service Worker / Cache Storage',
        action: () => clearPwaCachesAndReload(),
      },
      {
        id: 'action:open-devtools-help',
        title: '打开性能面板（提示）',
        subtitle: 'DevTools → Performance / Application',
        action: () => window.alert('DevTools → Performance / Application（Service Worker）'),
      },
    ];

    const seen = new Set<string>();
    return [...routes, ...actions].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [menus]);

  // 核心鉴权逻辑：如果没有用户信息且加载已完成，强制跳转登录
  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      // 记录当前 URL 以便登录后跳转回来
      const currentUrl = window.location.href;
      const isDev = process.env.NODE_ENV === 'development';
      const authBase = isDev ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
      window.location.href = `${authBase}/#/login?redirect=${encodeURIComponent(currentUrl)}`;
    }
  }, [user, loading, isPublicRoute]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 菜单加载逻辑
  useEffect(() => {
    if (user) {
      let mounted = true;
      fetchRemoteMenus(true)
        .then((remote) => {
          if (!mounted) return;
          if (remote && remote.length > 0) {
            setMenus(remote);
          } else {
            setMenus(builtInAsideMenus);
          }
        })
        .catch(() => {
          if (mounted) setMenus(builtInAsideMenus);
        });
      return () => {
        mounted = false;
      };
    }
  }, [user]);

  // 如果正在检查登录状态，或者未登录（即将跳转），显示全屏 Loading 或空状态，避免闪屏
  if (loading || (!user && !isPublicRoute)) {
    return <PageLoading loading />; // 避免首屏空白，同时给跳转登录留出过渡
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      <CommandPalette commands={commandItems} />
      {/* 1) Header always on top */}
      <HeaderBar isMobile={isMobile} onMenuToggle={() => setIsNavOpen(true)} />

      {/* 2) Body: Left Dock + Main Stage */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        <PageNav isMobile={isMobile} isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} menus={menus} />

        <div className="flex-1 flex flex-col min-w-0 h-full relative z-10">
          {/* The "Main Stage" - A floating glass card */}
          <main className="flex-1 p-4 md:p-6 overflow-hidden relative">
            <div className="w-full h-full rounded-[12px] bg-[var(--stage-bg)] border border-[var(--color-divider)] shadow-[var(--stage-shadow)] overflow-hidden flex flex-col transition-all duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
