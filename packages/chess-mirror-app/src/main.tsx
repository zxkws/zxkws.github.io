import React from 'react';
import ReactDOM from 'react-dom/client';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';
import App from './App';
import './index.css';

setLibraryName('chess-mirror');

type MountOptions = {
  container?: Element | string;
  basename?: string;
  customProps?: {
    container?: Element | string;
    basename?: string;
  };
};

let appRoot: ReactDOM.Root | null = null;

const resolveContainer = (target?: Element | string | null): Element | null => {
  if (!target) return null;
  return typeof target === 'string' ? document.querySelector(target) : target;
};

export const unmount = async () => {
  if (appRoot) {
    appRoot.unmount();
    appRoot = null;
  }
};

export const mount = async (options: MountOptions = {}) => {
  const { container, customProps } = options;
  const fallbackSelector = isInIcestark() ? undefined : '#root';
  const containerSource = container ?? customProps?.container ?? fallbackSelector;
  const target = resolveContainer(containerSource);

  if (!target) {
    console.warn('[chess-mirror] mount skipped: container missing');
    return;
  }

  if (appRoot) appRoot.unmount();
  appRoot = ReactDOM.createRoot(target);
  appRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
};

if (!isInIcestark()) {
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  document.body.style.margin = '0';
  document.body.style.background = '#020617';
  mount({ container: '#root' });
}
