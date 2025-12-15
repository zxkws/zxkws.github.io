import { AppRoute, AppRouter } from '@ice/stark';
import { Suspense, useEffect, useState } from 'react';
import ReactDom from 'react-dom/client';

import PageLoading from './components/PageLoading';
import './global.css';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import { ensureIcestarkAppsRegistered, loadConfig, resolveMicroApps } from './core/icestark';
import BasicLayout from './layouts/BasicLayout';
import AgentTaskPage from './pages/AgentTask';
import Home from './pages/Home';
import PermissionAdmin from './pages/PermissionAdmin';
import Profile from './pages/Profile';
import UserAdmin from './pages/UserAdmin';
import { subscribeLoading } from './services/networkLoading';
import { ensureHistoryIdx, replaceUrl } from './utils/safeHistory';

const NotFound = () => <div className="flex flex-1 items-center justify-center">页面飞走啦～</div>;

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
      .register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered: ', registration);

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
        NotFoundComponent={NotFound}
        LoadingComponent={<MicroAppLoading />}
        onError={(error) => console.error('[MainApp] micro app load failed', error)}
        onRouteChange={(pathname) => {
          const nextPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('main-route-change', { detail: nextPath }));
          }
        }}
      >
        <AppRoute exact activePath="/" component={<Home />} />
        <AppRoute exact activePath="/app/permission-admin" component={<PermissionAdmin />} />
        <AppRoute exact activePath="/app/user-admin" component={<UserAdmin />} />
        <AppRoute exact activePath="/app/agent-tasks" component={<AgentTaskPage />} />
        <AppRoute exact activePath="/profile" component={<Profile />} />
        {microApps.map((app) => (
          <AppRoute key={app.name} {...app} {...(app.render ? {} : app)} />
        ))}
        {IFRAME_MICRO_APPS.map((app) => (
          <AppRoute
            key={app.name}
            name={app.name}
            exact
            path={app.path}
            activePath={[app.path]}
            render={() => (
              <iframe
                src={resolveIframeSrc(app)}
                title={app.name}
                className="h-full w-full border-0"
                loading="lazy"
                allow="clipboard-write; clipboard-read"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            )}
          />
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
