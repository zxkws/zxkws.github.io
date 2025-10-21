import { AppRoute, AppRouter } from '@ice/stark';
import ReactDom from 'react-dom/client';
import { useEffect, useState } from 'react';

import PageLoading from './components/PageLoading';
import './global.scss';
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
import BasicLayout from './layouts/BasicLayout';
import About from './pages/About';
import Home from './pages/Home';
import Login from './pages/Login';
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
          const current = window.location.pathname + window.location.search + window.location.hash;
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

  return (
    <AuthProvider>
      <BasicLayout>
        <PageLoading loading={isMicroAppLoading}>
          <div className="app-router-shell flex flex-1 min-h-0 flex-col">
            <AppRouter
              NotFoundComponent={NotFound}
              onLoadingApp={() => notifyMicroAppLoading(true)}
              onFinishLoading={() => notifyMicroAppMounted()}
              onRouteChange={(pathname) => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('main-route-change', { detail: pathname }));
                }
              }}
            >
              <AppRoute exact activePath="/" component={<Home />} />
              <AppRoute exact activePath="/about" component={<About />} />
              <AppRoute exact activePath="/login" component={<Login />} />
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
          </div>
        </PageLoading>
      </BasicLayout>
    </AuthProvider>
  );
}

const root = document.getElementById('main-app-container');
if (root) {
  ReactDom.createRoot(root).render(<App />);
}
