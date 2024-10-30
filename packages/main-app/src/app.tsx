import PageLoading from '@/components/PageLoading';
// import FrameworkLayout from '@/layouts/FrameworkLayout';
import { AuthProvider } from './context/AuthContext';
import './global.scss';

import BasicLayout from '@/layouts/BasicLayout';
import ReactDom from 'react-dom/client';
import { registerMicroApps, render } from './micro';

const apps = [
  {
    name: 'curlconverter',
    activePath: '/curlconverter',
    title: 'curlconverter',
    iframe: 'https://curlconverter.com/',
  },
];

registerMicroApps(apps);

function App() {
  return (
    <AuthProvider>
      <BasicLayout>
        <PageLoading>
        </PageLoading>
      </BasicLayout>
    </AuthProvider>
  );
}

render({
  onAppEnter: () => {},
  onAppLeave: () => {},
  onLoadingApp: () => {},
  onFinishLoading: () => {},
});

ReactDom.createRoot(document.getElementById('main-app-container')!).render(<App />);
