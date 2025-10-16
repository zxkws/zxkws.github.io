import { AppRoute, AppRouter } from '@ice/stark';
import ReactDom from 'react-dom/client';
import { useEffect, useMemo, useState } from 'react';

import PageLoading from './components/PageLoading';
import './global.scss';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { ensureIcestarkStarted, resolveMicroApps, subscribeMicroAppLoading } from './core/icestark';
import BasicLayout from './layouts/BasicLayout';
import About from './pages/About';
import Home from './pages/Home';
import Login from './pages/Login';

const NotFound = () => <div className="flex flex-1 items-center justify-center">页面飞走啦～</div>;

function App() {
  const [isMicroAppLoading, setIsMicroAppLoading] = useState(false);
  const microApps = useMemo(() => resolveMicroApps(), []);

  useEffect(() => {
    ensureIcestarkStarted();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeMicroAppLoading(setIsMicroAppLoading);
    return unsubscribe;
  }, []);

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
