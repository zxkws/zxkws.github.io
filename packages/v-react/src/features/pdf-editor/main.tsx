import React from 'react';
import ReactDOM from 'react-dom/client';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';

import PdfEditorApp from './PdfEditorApp';
import './styles.css';

type MountOptions = {
  container?: Element | string;
  basename?: string;
  customProps?: {
    basename?: string;
    container?: Element | string;
  };
};

type RenderOptions = {
  container: Element;
  basename?: string;
};

let appRoot: ReactDOM.Root | null = null;
setLibraryName('pdf-editor-app');

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
  appRoot.render(<PdfEditorApp basename={basename ?? getBasename()} />);
};

export const unmount = async () => {
  if (appRoot) {
    appRoot.unmount();
    appRoot = null;
  }
};

export const mount = async (options: MountOptions = {}) => {
  const { container, basename, customProps } = options;
  const fallbackSelector = isInIcestark() ? undefined : '#app';
  const containerSource = container ?? customProps?.container ?? fallbackSelector;
  const target = resolveContainer(containerSource);

  if (!target) {
    // Prefetch 阶段可能未提供容器
    return;
  }

  renderApp({
    container: target,
    basename: basename ?? customProps?.basename,
  });
};

if (!isInIcestark()) {
  mount({ container: '#app', basename: import.meta.env.BASE_URL });
}
