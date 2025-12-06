import { AppRoute, AppRouter } from '@ice/stark';
import ReactDom from 'react-dom/client';
import { useEffect, useState, lazy, Suspense } from 'react';

import PageLoading from './components/PageLoading';
import './global.css';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import {
  ensureIcestarkStarted,
  ensureIcestarkAppsRegistered,
  resolveMicroApps,
  subscribeMicroAppLoading,
  loadConfig,
  notifyMicroAppLoading,
  notifyMicroAppMounted,
} from './core/icestark';
const BasicLayout = lazy(() => import('./layouts/BasicLayout'));
const Home = lazy(() => import('./pages/Home'));
const PermissionAdmin = lazy(() => import('./pages/PermissionAdmin'));
const UserAdmin = lazy(() => import('./pages/UserAdmin'));
const Profile = lazy(() => import('./pages/Profile'));
import appHistory from '@ice/stark/lib/appHistory';

const NotFound = () => <div className="flex flex-1 items-center justify-center">页面飞走啦～</div>;

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
    prodSrc: 'https://zxkws.nyc.mn/textdiff/',
  },
  {
    name: 'curlconverter',
    path: '/curlconverter',
    prodSrc: 'https://curlconverter.com/',
  },
  {
    name: 'config-hub',
    path: '/config-hub',
    devSrc: 'http://localhost:5176',
    prodSrc: 'https://zxkws.nyc.mn/config-hub/',
  },
];

const resolveIframeSrc = (app: IframeMicroApp) => {
  if (isDevelopment && app.devSrc) {
    return app.devSrc;
  }
  return app.prodSrc;
};

function App() {
  const [isMicroAppLoading, setIsMicroAppLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [microApps, setMicroApps] = useState<ReturnType<typeof resolveMicroApps>>([]);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        setConfigError(null);
        await loadConfig();
        const apps = resolveMicroApps();
        ensureIcestarkAppsRegistered(apps);
        setMicroApps(apps);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('config-loaded'));
          const current =
            (window.location?.pathname ?? '') + (window.location?.search ?? '') + (window.location?.hash ?? '');
          setTimeout(() => {
            appHistory.replace(current || '/');
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
    const unsubscribe = subscribeMicroAppLoading(setIsMicroAppLoading);
    return unsubscribe;
  }, []);

  // 安全兜底：若微应用在 3 秒内未完成加载（或入口 404/未启动），强制关闭全局 loading，防止遮罩卡死
  useEffect(() => {
    if (!isMicroAppLoading) {
      return;
    }
    const timer = window.setTimeout(() => {
      console.warn('[MainApp] micro app load timeout, closing loading overlay');
      notifyMicroAppLoading(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [isMicroAppLoading]);

  // 当微应用加载失败（例如 dev server 未启动或网络错误）时，确保关闭全局 Loading，避免界面被遮罩锁死。
  useEffect(() => {
    const handleLoadError = (event: PromiseRejectionEvent | ErrorEvent) => {
      const detail =
        'reason' in event
          ? (event as PromiseRejectionEvent).reason
          : 'error' in event
            ? (event as ErrorEvent).error
            : event;
      console.error('[MainApp] micro app load failed', detail);
      notifyMicroAppLoading(false);
    };

    window.addEventListener('unhandledrejection', handleLoadError);
    window.addEventListener('error', handleLoadError);

    return () => {
      window.removeEventListener('unhandledrejection', handleLoadError);
      window.removeEventListener('error', handleLoadError);
    };
  }, []);

  useEffect(() => {
    if (microApps.length > 0) {
      ensureIcestarkAppsRegistered(microApps);
    }
  }, [microApps]);

  useEffect(() => {
    if (!configLoaded) {
      return;
    }
    ensureIcestarkStarted();
  }, [configLoaded]);

  if (configError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
        <h1 className="mb-4 text-2xl font-semibold">无法加载配置中心数据</h1>
        <p className="mb-6 text-sm opacity-80">{configError}</p>
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white shadow hover:bg-blue-600"
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
        onLoadingApp={() => notifyMicroAppLoading(true)}
        onFinishLoading={() => notifyMicroAppMounted()}
        onRouteChange={(pathname) => {
          const nextPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : '/');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('main-route-change', { detail: nextPath }));
          }
        }}
      >
        <AppRoute exact activePath="/" render={() => <Home />} />
        <AppRoute exact activePath="/app/permission-admin" render={() => <PermissionAdmin />} />
        <AppRoute exact activePath="/app/user-admin" render={() => <UserAdmin />} />
        <AppRoute exact activePath="/profile" render={() => <Profile />} />
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
      <Suspense fallback={<PageLoading loading />}>
        <BasicLayout>
          <PageLoading loading={isMicroAppLoading}>
            <div className="app-router-shell flex flex-1 min-h-0 flex-col">{routerContent}</div>
          </PageLoading>
        </BasicLayout>
      </Suspense>
    </AuthProvider>
  );
}

const root = document.getElementById('main-app-container');
if (root) {
  ReactDom.createRoot(root).render(<App />);
}
