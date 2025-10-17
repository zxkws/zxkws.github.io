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

const NotFound = () => <div className="flex flex-1 items-center justify-center">页面飞走啦～</div>;

function App() {
  const [isMicroAppLoading, setIsMicroAppLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [microApps, setMicroApps] = useState<ReturnType<typeof resolveMicroApps>>([]);

  useEffect(() => {
    loadConfig().then(() => {
      console.log('[App] Config loaded, updating state and dispatching event');
      setConfigLoaded(true);
      setMicroApps(resolveMicroApps());
      ensureIcestarkStarted();
      if (typeof window !== 'undefined') {
        console.log('[App] Dispatching config-loaded event');
        window.dispatchEvent(new CustomEvent('config-loaded'));
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
            <AppRoute exact path="/" component={<Home />} />
            <AppRoute exact path="/about" component={<About />} />
            <AppRoute exact path="/login" component={<Login />} />
            {microApps.map((app) => (
              <AppRoute key={app.name} {...app} />
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
