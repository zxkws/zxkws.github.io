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

  useEffect(() => {
    loadConfig().then(() => {
      setConfigLoaded(true);
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
    });
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMicroAppLoading(setIsMicroAppLoading);
    return unsubscribe;
  }, []);

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
            <AppRoute
              activePath="/foo"
              render={() => {
                return <iframe src="http://www.example.com" />;
              }}
            />
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
