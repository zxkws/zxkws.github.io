import { AppRoute, AppRouter } from '@ice/stark';
import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
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

import ErrorBoundary from './components/ErrorBoundary';
import PageLoading from './components/PageLoading';
import './global.css';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { ensureIcestarkAppsRegistered, loadConfig, resolveMicroApps } from './core/icestark';
import BasicLayout from './layouts/BasicLayout';
import { builtInAsideMenus } from './layouts/BasicLayout/menuConfig';
import Home from './pages/Home';
import { addMicroAppLoadMetric, recordRecentRoute } from './services/dashboardStorage';
import { subscribeLoading } from './services/networkLoading';
import { ensureHistoryIdx, replaceUrl } from './utils/safeHistory';

const RouteNotFound = () => <div className="flex flex-1 items-center justify-center">页面飞走啦～</div>;

const PermissionAdmin = lazy(() => import('./pages/PermissionAdmin'));
const UserAdmin = lazy(() => import('./pages/UserAdmin'));
const AgentTaskPage = lazy(() => import('./pages/AgentTask'));
const Profile = lazy(() => import('./pages/Profile'));

const MicroAppLoading = () => (
  <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3 rounded-lg bg-[var(--color-bg)] px-6 py-4 text-[var(--color-text)] shadow-lg">
      <span
        className="inline-flex h-8 w-8 animate-spin rounded-full border-4"
        style={{
          borderColor: 'var(--spinner-track)',
          borderTopColor: 'var(--spinner-head)',
        }}
        aria-hidden="true"
      />
      <span className="text-sm font-medium tracking-wide">Loading...</span>
    </div>
  </div>
);

const isDevelopment = process.env.NODE_ENV === 'development';

type IframeMicroApp = {
  name: string;
  path: string;
  devSrc?: string;
  prodSrc: string;
};

const IFRAME_MICRO_APPS: IframeMicroApp[] = [
  {
    name: 'textdiff',
    path: '/textdiff',
    devSrc: 'http://localhost:5174',
    prodSrc: '/textdiff/',
  },
  {
    name: 'curlconverter',
    path: '/curlconverter',
    prodSrc: 'https://curlconverter.com/',
  },
];

const resolveIframeSrc = (app: IframeMicroApp) => {
  if (isDevelopment && app.devSrc) {
    return app.devSrc;
  }
  return app.prodSrc;
};

const LocalRoutes = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  const content = (() => {
    if (pathname === '/') return <Home />;
    if (pathname === '/profile') return <Profile />;
    if (pathname === '/app/permission-admin') return <PermissionAdmin />;
    if (pathname === '/app/user-admin') return <UserAdmin />;
    if (pathname === '/app/agent-tasks') return <AgentTaskPage />;

    const iframe = IFRAME_MICRO_APPS.find((app) => pathname === app.path || pathname === `${app.path}/`);
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
      if (window.confirm('检测到新版本，是否立即刷新体验？')) {
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
  const [isFetchLoading, setIsFetchLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [microApps, setMicroApps] = useState<ReturnType<typeof resolveMicroApps>>([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const microAppLoadingStarts = useRef<Map<string, number>>(new Map());

  const routeLabelIndex = useMemo(() => {
    const entries: Array<{ path: string; label: string }> = [];
    builtInAsideMenus.forEach((item) => {
      if (item.path && item.name) {
        entries.push({ path: item.path, label: item.name });
      }
    });
    entries.push({ path: '/profile', label: '个人资料' });
    return entries.sort((a, b) => b.path.length - a.path.length);
  }, []);

  const resolveRouteLabel = useMemo(() => {
    return (pathname: string) =>
      routeLabelIndex.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))?.label;
  }, [routeLabelIndex]);

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
        setConfigError(error instanceof Error ? error.message : '加载配置失败');
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        <h1 className="mb-4 text-2xl font-semibold">无法加载配置中心数据</h1>
        <p className="mb-6 text-sm opacity-80">{configError}</p>
        <button
          type="button"
          className="rounded bg-primary-500 px-4 py-2 text-white shadow hover:bg-primary-600"
          onClick={() => window.location.reload()}
        >
          刷新重试
        </button>
      </div>
    );
  }

  if (!configLoaded) {
    return <PageLoading loading />;
  }

  const routerContent = (
    <Suspense fallback={<PageLoading loading />}>
      <AppRouter
        NotFoundComponent={LocalRoutes}
        LoadingComponent={<MicroAppLoading />}
        onLoadingApp={(app) => {
          if (app?.name) {
            microAppLoadingStarts.current.set(app.name, Date.now());
          }
        }}
        onFinishLoading={(app) => {
          if (!app?.name) return;
          const startedAt = microAppLoadingStarts.current.get(app.name);
          if (!startedAt) return;
          microAppLoadingStarts.current.delete(app.name);

          const durationMs = Date.now() - startedAt;
          const path =
            typeof (app as { path?: string }).path === 'string'
              ? (app as { path?: string }).path
              : Array.isArray((app as { activePath?: string[] }).activePath)
                ? (app as { activePath?: string[] }).activePath?.[0]
                : undefined;

          addMicroAppLoadMetric({ name: app.name, path, durationMs });
        }}
        onError={(error) => console.error('[MainApp] micro app load failed', error)}
        onRouteChange={(pathname) => {
          const nextPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('main-route-change', { detail: nextPath }));
          }
          recordRecentRoute({ path: nextPath, label: resolveRouteLabel(nextPath) });
        }}
      >
        {microApps.map((app) => (
          <AppRoute key={app.name} {...app} {...(app.render ? {} : app)} />
        ))}
      </AppRouter>
    </Suspense>
  );

  return (
    <AuthProvider>
      <UserProvider>
        <BasicLayout>
          <PageLoading loading={isFetchLoading}>
            <div className="app-router-shell relative flex flex-1 min-h-0 flex-col">{routerContent}</div>
          </PageLoading>
        </BasicLayout>
      </UserProvider>
    </AuthProvider>
  );
}

const root = document.getElementById('main-app-container');
if (root) {
  ReactDom.createRoot(root).render(<App />);
}
