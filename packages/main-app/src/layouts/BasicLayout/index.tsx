import { type ReactNode, useEffect, useMemo, useState } from 'react';
import CommandPalette, { type CommandItem } from '../../components/CommandPalette';
import PageLoading from '../../components/PageLoading';
import { useUser } from '../../context/UserContext';
import { useLanguage } from '../../i18n';
import { fetchRemoteMenus } from '../../services/menuService';
import type { MenuItem } from '../../types/menu';
import { clearPwaCachesAndReload } from '../../utils/pwa';
import HeaderBar from './components/HeaderBar';
import PageNav from './components/PageNav';
import * as styles from './index.module.css';
import { builtInAsideMenus } from './menuConfig';

const readPathname = () => (typeof window === 'undefined' ? '/' : window.location.pathname || '/');

export default function BasicLayout({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [pathname, setPathname] = useState(readPathname);
  const { user, loading } = useUser();
  const { t } = useLanguage();
  const [menus, setMenus] = useState<MenuItem[]>(builtInAsideMenus);

  const visibleMenus = useMemo(() => {
    const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');
    const filterMenus = (items: MenuItem[]): MenuItem[] =>
      items.flatMap((item) => {
        if (item.visible === false || (item.requiresAuth && !user) || (item.adminOnly && !isAdmin)) return [];
        const nestedItems = item.children ? filterMenus(item.children) : undefined;
        return [{ ...item, children: nestedItems }];
      });
    return filterMenus(menus);
  }, [menus, user]);

  const isPortalRoute = pathname === '/' || pathname === '/product-lab';
  const isPublicRoute =
    isPortalRoute ||
    pathname === '/chess-mirror' ||
    pathname.startsWith('/chess-mirror/') ||
    pathname.startsWith('/tools/') ||
    pathname === '/app/watch-together' ||
    pathname === '/textdiff' ||
    pathname === '/v-app/text-difference' ||
    pathname.startsWith('/v-app/text-difference/') ||
    pathname === '/v-app/json-viewer' ||
    pathname.startsWith('/v-app/json-viewer/');

  const commandItems = useMemo<CommandItem[]>(() => {
    const flatten = (items: MenuItem[], prefix: string[] = []) => {
      const out: CommandItem[] = [];
      items.forEach((item) => {
        const title = item.i18nKey ? t(item.i18nKey) : item.name || '';
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
        if (item.children?.length) {
          out.push(...flatten(item.children, keywords));
        }
      });
      return out;
    };

    const routes = flatten(visibleMenus);
    const actions: CommandItem[] = [
      {
        id: 'action:reload',
        title: t('common.reload'),
        subtitle: 'window.location.reload()',
        action: () => window.location.reload(),
      },
      {
        id: 'action:clear-cache-reload',
        title: t('common.clearCacheReload'),
        subtitle: 'Service Worker / Cache Storage',
        action: () => clearPwaCachesAndReload(),
      },
    ];

    const seen = new Set<string>();
    return [...routes, ...actions].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [t, visibleMenus]);

  useEffect(() => {
    if (!loading && !user && !isPublicRoute) {
      const currentUrl = window.location.href;
      const isDev = process.env.NODE_ENV === 'development';
      const authBase = isDev ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
      window.location.href = `${authBase}/#/login?redirect=${encodeURIComponent(currentUrl)}`;
    }
  }, [user, loading, isPublicRoute]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const syncViewport = () => setIsMobile(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    const syncPathname = () => {
      setPathname(readPathname());
      setIsNavOpen(false);
    };
    window.addEventListener('main-route-change', syncPathname);
    window.addEventListener('popstate', syncPathname);
    return () => {
      window.removeEventListener('main-route-change', syncPathname);
      window.removeEventListener('popstate', syncPathname);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMenus(builtInAsideMenus);
      return;
    }

    let mounted = true;
    fetchRemoteMenus(true)
      .then((remote) => {
        if (!mounted) return;
        if (!remote?.length) {
          setMenus(builtInAsideMenus);
          return;
        }
        const next = [...remote];
        const existingPaths = new Set(next.map((item) => item.path).filter(Boolean));
        builtInAsideMenus
          .filter(
            (item) =>
              item.path &&
              !existingPaths.has(item.path) &&
              (item.external ||
                item.path === '/app/security-center' ||
                item.path === '/app/account-vault' ||
                (item.adminOnly && (user.role === 'admin' || user.roles?.includes('admin')))),
          )
          .forEach((item) => {
            next.push(item);
          });
        setMenus(next);
      })
      .catch(() => {
        if (mounted) setMenus(builtInAsideMenus);
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading || (!user && !isPublicRoute)) {
    return <PageLoading loading />;
  }

  return (
    <div className={`${styles.layout} ${isPortalRoute ? styles.portalLayout : styles.workspaceLayout}`}>
      <CommandPalette commands={commandItems} />
      <HeaderBar isMobile={isMobile} isPortal={isPortalRoute} onMenuToggle={() => setIsNavOpen(true)} />

      {isPortalRoute ? (
        <main className={styles.portalMain}>{children}</main>
      ) : (
        <div className={styles.workspaceBody}>
          <PageNav isMobile={isMobile} isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} menus={visibleMenus} />
          <main className={styles.workspaceMain}>
            <div className={styles.workspaceStage}>{children}</div>
          </main>
        </div>
      )}
    </div>
  );
}
