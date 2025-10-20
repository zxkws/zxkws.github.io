import { AppRoute, AppRouter } from '@ice/stark';
import ReactDom from 'react-dom/client';
import { useEffect, useState } from 'react';

import PageLoading from './components/PageLoading';
import './global.scss';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ensureIcestarkStarted, resolveMicroApps, subscribeMicroAppLoading, loadConfig } from './core/icestark';
import BasicLayout from './layouts/BasicLayout';
import About from './pages/About';
import Home from './pages/Home';
import Login from './pages/Login';
import IframeWrapper from './microApps/IframeWrapper';
import appHistory from '@ice/stark/lib/appHistory';

const NotFound = () => <div className="flex flex-1 items-center justify-center">页面飞走啦～</div>;

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
        setMicroApps(apps);
        ensureIcestarkStarted();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('config-loaded'));
          const current = window.location.pathname + window.location.search + window.location.hash;
          const needsRematch = apps.some((app) => {
            const path = (app as { path?: string }).path;
            return path && current.startsWith(path);
          });
          if (needsRematch && current !== '/') {
            appHistory.replace('/');
            setTimeout(() => {
              appHistory.replace(current);
            }, 0);
          } else {
            appHistory.replace(current);
          }
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
    return <PageLoading loading={true} />;
  }

  return (
    <AuthProvider>
      <BasicLayout>
        <PageLoading loading={isMicroAppLoading}>
          <AppRouter NotFoundComponent={NotFound}>
            <AppRoute exact activePath="/" component={<Home />} />
            <AppRoute exact activePath="/about" component={<About />} />
            <AppRoute exact activePath="/login" component={<Login />} />
            {microApps.map((app) => (
              <AppRoute
                key={app.name}
                {...app}
                {...(app['iframe'] ? { render: () => <IframeWrapper src={app.entry} /> } : {})}
              />
            ))}
          </AppRouter>
        </PageLoading>
      </BasicLayout>
    </AuthProvider>
  );
}

const root = document.getElementById('main-app-container');
if (root) {
  ReactDom.createRoot(root).render(<App />);
}
