import { AppRoute, AppRouter } from '@ice/stark';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import ReactDom from 'react-dom/client';

// Expose React and ReactDOM for micro-apps (Shared Dependency Strategy)
type MicroFrontendGlobals = Window & {
  React?: typeof React;
  ReactDOM?: typeof ReactDom;
};

if (typeof window !== 'undefined') {
  const globals = window as MicroFrontendGlobals;
  globals.React = React;
  globals.ReactDOM = ReactDom;
}

import ContactSupport from './components/ContactSupport';
import ErrorBoundary from './components/ErrorBoundary';
import PageLoading from './components/PageLoading';
import '@zxkws/shared-theme/theme.css';
import './global.css';
import './index.css';
import './pages/workspace-pages.css';
import { UserProvider } from './context/UserContext';
import { ensureIcestarkAppsRegistered, loadConfig, resolveMicroApps } from './core/icestark';
import { LanguageProvider, readLanguage, translate, useLanguage } from './i18n';
import BasicLayout from './layouts/BasicLayout';
import NavHome from './pages/NavHome';
import { resolveMenuPath } from './services/menuService';
import { subscribeLoading } from './services/networkLoading';
import { ensureHistoryIdx, replaceUrl } from './utils/safeHistory';

const RouteNotFound = () => {
  const { t } = useLanguage();
  return (
    <div className="workspace-page workspace-feedback-screen">
      <section className="workspace-panel workspace-feedback-card">
        <p className="workspace-page__eyebrow">404 / Not found</p>
        <h1>{t('error.notFoundTitle')}</h1>
        <p className="workspace-page__description">{t('error.notFoundDescription')}</p>
        <div className="workspace-inline-actions workspace-feedback-actions">
          <a className="workspace-button workspace-button--primary" href="/">
            {t('error.backPortal')}
          </a>
        </div>
      </section>
    </div>
  );
};
const normalizePathname = (value: string) => (value.length > 1 && value.endsWith('/') ? value.slice(0, -1) : value);

const PermissionAdmin = lazy(() => import('./pages/PermissionAdmin'));
const MenuAdmin = lazy(() => import('./pages/MenuAdmin'));
const RoleAdmin = lazy(() => import('./pages/RoleAdmin'));
const ProductLab = lazy(() => import('./pages/ProductLab'));
const Navigation = lazy(() => import('./pages/Navigation'));
const UserAdmin = lazy(() => import('./pages/UserAdmin'));
const Profile = lazy(() => import('./pages/Profile'));
const WatchTogetherPage = lazy(() => import('./pages/WatchTogether'));
const ConfigCenter = lazy(() => import('./pages/ConfigCenter'));
const BlogStudio = lazy(() => import('./pages/BlogStudio'));
const SecurityCenter = lazy(() => import('./pages/SecurityCenter'));
const AgentPlatform = lazy(() => import('./pages/AgentPlatform'));

const MicroAppLoading = () => <PageLoading loading contained />;

const isDevelopment = process.env.NODE_ENV === 'development';

type IframeMicroApp = {
  name: string;
  path: string;
  devSrc?: string;
  prodSrc: string;
};

const IFRAME_MICRO_APPS: IframeMicroApp[] = [
  {
    name: 'curlconverter',
    path: '/tools/curlconverter',
    prodSrc: 'https://curlconverter.com/',
  },
];

const resolveIframeSrc = (app: IframeMicroApp) => {
  if (isDevelopment && app.devSrc) {
    return app.devSrc;
  }
  return app.prodSrc;
};

const LocalRoutes = ({ pathname }: { pathname: string }) => {
  const content = (() => {
    if (pathname === '/') return <NavHome />;
    if (pathname === '/app/navigation') return <Navigation />;
    if (pathname === '/product-lab') return <ProductLab />;
    if (pathname === '/profile') return <Profile />;
    if (pathname === '/app/menu-admin') return <MenuAdmin />;
    if (pathname === '/app/role-admin') return <RoleAdmin />;
    if (pathname === '/app/permission-admin') return <PermissionAdmin />;
    if (pathname === '/app/user-admin') return <UserAdmin />;
    if (pathname === '/app/watch-together') return <WatchTogetherPage />;
    if (pathname === '/app/config-center') return <ConfigCenter />;
    if (pathname === '/app/blog-studio') return <BlogStudio />;
    if (pathname === '/app/security-center') return <SecurityCenter />;
    if (pathname === '/app/agent-platform') return <AgentPlatform />;

    const iframe = IFRAME_MICRO_APPS.find((app) => pathname === app.path);
    if (iframe) {
      return (
        <iframe
          src={resolveIframeSrc(iframe)}
          title={iframe.name}
          className="h-full w-full border-0"
          loading="lazy"
          allow="clipboard-write; clipboard-read"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }
    return <RouteNotFound />;
  })();

  return <ErrorBoundary resetKey={pathname}>{content}</ErrorBoundary>;
};

// --- Service Worker Registration ---
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const pageLoadedAt = Date.now();
    let updateInstalled = false;
    let reloading = false;

    const reload = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    const maybeReloadForUpdate = () => {
      const elapsed = Date.now() - pageLoadedAt;
      // 刷新后的首屏阶段不弹窗，直接自动刷新一次以拿到最新资源（避免“刷新后还要再点一次确认/再刷一次”）
      if (elapsed < 5000) {
        reload();
        return;
      }
      if (window.confirm(translate(readLanguage(), 'update.confirm'))) {
        reload();
      }
    };

    // 当新 SW 接管页面时触发；配合 workbox 的 clientsClaim/skipWaiting 实现平滑升级
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!updateInstalled) return;
      maybeReloadForUpdate();
    });

    navigator.serviceWorker
      .register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('SW registered: ', registration);
        registration.update().catch(() => undefined);

        // 监听更新：新 SW 安装完成后，等待其接管（controllerchange）再做刷新处理
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state !== 'installed') return;

            // 首次安装（没有 controller）不需要刷新
            if (!navigator.serviceWorker.controller) {
              console.log('Content is cached for offline use.');
              return;
            }

            updateInstalled = true;
          });
        });
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
// -----------------------------------

function App() {
  const { t } = useLanguage();
  const [isFetchLoading, setIsFetchLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [microApps, setMicroApps] = useState<ReturnType<typeof resolveMicroApps>>([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? normalizePathname(window.location.pathname) : '/',
  );

  const microAppPrefixes = useMemo(() => {
    const list = microApps
      .map((app) => {
        const path =
          typeof (app as { path?: string }).path === 'string'
            ? (app as { path?: string }).path
            : Array.isArray((app as { activePath?: string[] }).activePath)
              ? (app as { activePath?: string[] }).activePath?.[0]
              : undefined;
        return typeof path === 'string' ? normalizePathname(path) : undefined;
      })
      .filter(Boolean) as string[];
    return list.sort((a, b) => b.length - a.length);
  }, [microApps]);

  const isMicroAppRoute = useMemo(() => {
    return microAppPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  }, [microAppPrefixes, pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => normalizePathname(window.location.pathname);
    setPathname(read());

    const onMainRouteChange = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        setPathname(normalizePathname(detail));
        return;
      }
      setPathname(read());
    };

    const onPopState = () => {
      window.dispatchEvent(new CustomEvent('main-route-change', { detail: read() }));
    };

    window.addEventListener('main-route-change', onMainRouteChange as EventListener);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('main-route-change', onMainRouteChange as EventListener);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, []);

  useEffect(() => {
    const resolvedPath = resolveMenuPath(pathname);
    if (resolvedPath && resolvedPath !== pathname) {
      if (/^https?:\/\//.test(resolvedPath)) {
        window.location.replace(resolvedPath);
        return;
      }
      replaceUrl(resolvedPath);
    }
  }, [pathname]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setConfigError(null);
        // Ensure history.state contains a stable idx/key shape so React Router
        // inside micro-apps won't be broken by host navigation.
        ensureHistoryIdx();
        await loadConfig();
        const apps = resolveMicroApps();
        ensureIcestarkAppsRegistered(apps);
        setMicroApps(apps);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('config-loaded'));
          const current =
            (window.location?.pathname ?? '') + (window.location?.search ?? '') + (window.location?.hash ?? '');
          setTimeout(() => {
            replaceUrl(current || '/');
          }, 0);
        }
        setConfigLoaded(true);
      } catch (error) {
        console.error('[MainApp] Failed to initialize configuration', error);
        setConfigError(error instanceof Error ? error.message : translate(readLanguage(), 'error.configTitle'));
        setConfigLoaded(false);
        setMicroApps([]);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const unsubscribeFetch = subscribeLoading(setIsFetchLoading);
    return () => {
      unsubscribeFetch();
    };
  }, []);

  useEffect(() => {
    if (microApps.length > 0) {
      ensureIcestarkAppsRegistered(microApps);
    }
  }, [microApps]);

  if (configError) {
    return (
      <div className="workspace-page workspace-feedback-screen">
        <section className="workspace-panel workspace-feedback-card">
          <p className="workspace-page__eyebrow">Configuration error</p>
          <h1>{t('error.configTitle')}</h1>
          <p className="workspace-page__description">{configError}</p>
          <div className="workspace-inline-actions workspace-feedback-actions">
            <button
              type="button"
              className="workspace-button workspace-button--primary"
              onClick={() => window.location.reload()}
            >
              {t('common.retry')}
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!configLoaded) {
    return <PageLoading loading />;
  }

  const routerContent = (
    <Suspense fallback={<PageLoading loading />}>
      {isMicroAppRoute ? (
        <AppRouter
          LoadingComponent={<MicroAppLoading />}
          onError={(error) => console.error('[MainApp] micro app load failed', error)}
          onRouteChange={(next) => {
            const nextPath = next || (typeof window !== 'undefined' ? window.location.pathname : '/');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('main-route-change', { detail: nextPath }));
            }
          }}
        >
          {microApps.map((app) => (
            <AppRoute key={app.name} {...app} {...(app.render ? {} : app)} />
          ))}
        </AppRouter>
      ) : (
        <LocalRoutes pathname={pathname} />
      )}
    </Suspense>
  );

  return (
    <UserProvider>
      <BasicLayout>
        <PageLoading loading={isFetchLoading}>
          <div className="app-router-shell relative flex flex-1 min-h-0 flex-col">{routerContent}</div>
        </PageLoading>
      </BasicLayout>
      <ContactSupport />
    </UserProvider>
  );
}

const root = document.getElementById('main-app-container');
if (root) {
  ReactDom.createRoot(root).render(
    <LanguageProvider>
      <LocalizedApp />
    </LanguageProvider>,
  );
}

function LocalizedApp() {
  const { language } = useLanguage();
  return (
    <ConfigProvider locale={language === 'zh-CN' ? zhCN : enUS}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ConfigProvider>
  );
}
