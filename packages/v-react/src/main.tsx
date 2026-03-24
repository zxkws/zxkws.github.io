import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';
import { App } from './modules/App';
import '@zxkws/shared-theme/theme.css';
import './styles.css';

setLibraryName('v-react');

type MountOptions = {
  container?: Element | string;
  basename?: string;
  customProps?: {
    container?: Element | string;
    basename?: string;
  };
};

type RenderOptions = {
  container: Element;
  basename?: string;
};

let appRoot: ReactDOM.Root | null = null;
let mountedContainer: Element | null = null;

const resolveContainer = (target?: Element | string | null): Element | null => {
  if (!target) return null;
  return typeof target === 'string' ? document.querySelector(target) : target;
};

const renderApp = ({ container, basename }: RenderOptions) => {
  if (appRoot) appRoot.unmount();
  if (mountedContainer && mountedContainer !== container) {
    mountedContainer.classList.remove('v-react-root');
  }
  container.classList.add('v-react-root');
  mountedContainer = container;
  const queryClient = new QueryClient();
  appRoot = ReactDOM.createRoot(container);
  appRoot.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App basename={basename ?? getBasename()} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
};

export const unmount = async () => {
  if (appRoot) {
    appRoot.unmount();
    appRoot = null;
  }
  if (mountedContainer) {
    mountedContainer.classList.remove('v-react-root');
    mountedContainer = null;
  }
};

export const mount = async (options: MountOptions = {}) => {
  const { container, basename, customProps } = options;
  const fallbackSelector = isInIcestark() ? undefined : '#root';
  const containerSource = container ?? customProps?.container ?? fallbackSelector;
  const target = resolveContainer(containerSource);
  if (!target) {
    console.warn('[v-react] mount skipped: container missing');
    return;
  }
  renderApp({
    container: target,
    basename: basename ?? customProps?.basename,
  });
};

if (!isInIcestark()) {
  mount({ container: '#root', basename: import.meta.env.BASE_URL });
}
