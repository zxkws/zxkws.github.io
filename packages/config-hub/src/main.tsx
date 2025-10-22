import React from 'react';
import ReactDOM from 'react-dom/client';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';

import App from './App';
import './styles.css';

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
setLibraryName('config-hub');

const resolveContainer = (target?: Element | string | null): Element | null => {
  if (!target) {
    return null;
  }
  return typeof target === 'string' ? document.querySelector(target) : target;
};

const renderApp = ({ container, basename }: RenderOptions) => {
  if (appRoot) {
    appRoot.unmount();
  }
  appRoot = ReactDOM.createRoot(container);
  appRoot.render(
    <React.StrictMode>
      <App key={basename ?? 'config-hub'} />
    </React.StrictMode>,
  );
};

export const unmount = async () => {
  if (appRoot) {
    appRoot.unmount();
    appRoot = null;
  }
};

export const mount = async (options: MountOptions = {}) => {
  const { container, basename, customProps } = options;
  const fallbackSelector = isInIcestark() ? undefined : '#root';
  const containerSource = container ?? customProps?.container ?? fallbackSelector;
  const target = resolveContainer(containerSource);

  if (!target) {
    // Prefetch 阶段可能还没有容器
    return;
  }

  renderApp({
    container: target,
    basename: basename ?? customProps?.basename ?? getBasename(),
  });
};

if (!isInIcestark()) {
  mount({ container: '#root', basename: import.meta.env.BASE_URL });
}
