import { AppRoute, AppRouter } from '@ice/stark';
import appHistory from '@ice/stark/lib/appHistory';
import { Suspense, useEffect, useState } from 'react';
import ReactDom from 'react-dom/client';

import PageLoading from './components/PageLoading';
import './global.css';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { GUEST_USER, UserProvider } from './context/UserContext';
import {
  ensureIcestarkAppsRegistered,
  ensureIcestarkStarted,
  loadConfig,
  notifyMicroAppLoading,
  notifyMicroAppMounted,
  resolveMicroApps,
  subscribeMicroAppLoading,
} from './core/icestark';
import BasicLayout from './layouts/BasicLayout';
import AgentTaskPage from './pages/AgentTask';
import Home from './pages/Home';
import PermissionAdmin from './pages/PermissionAdmin';
import Profile from './pages/Profile';
import UserAdmin from './pages/UserAdmin';
import { subscribeLoading } from './services/networkLoading';

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
];

const resolveIframeSrc = (app: IframeMicroApp) => {
  if (isDevelopment && app.devSrc) {
    return app.devSrc;
  }
  return app.prodSrc;
};

function App() {
  const [isMicroAppLoading, setIsMicroAppLoading] = useState(false);
  const [isFetchLoading, setIsFetchLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [microApps, setMicroApps] = useState<ReturnType<typeof resolveMicroApps>>([]);
  const [configError, setConfigError] = useState<string | null>(null);

  // 监听 URL 上的 ?guest=true 参数
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('guest') === 'true') {
      try {
        window.localStorage.setItem('is_guest', 'true');
        // 清理 URL 参数
        url.searchParams.delete('guest');
        window.history.replaceState({}, '', url.toString());
        // 触发一个自定义事件或 reload 来确保 UserContext 捕捉到变化 (UserContext 内部也会读 storage)
        // 但最简单的是不做任何事，因为 UserContext 初始化时会读取 storage
      } catch {
        // ignore
      }
    }
  }, []);

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
    const unsubscribeFetch = subscribeLoading(setIsFetchLoading);
    return () => {
      unsubscribe();
      unsubscribeFetch();
    };
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
        onLoadingApp={() => notifyMicroAppLoading(true)}
        onFinishLoading={() => notifyMicroAppMounted()}
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
          <PageLoading loading={isMicroAppLoading || isFetchLoading}>
            <div className="app-router-shell flex flex-1 min-h-0 flex-col">{routerContent}</div>
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
