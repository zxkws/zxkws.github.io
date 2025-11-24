import ReactDOM from 'react-dom/client';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';

import App from './App';

setLibraryName('person-resume-app');

let appRoot: ReactDOM.Root | null = null;

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

const resolveContainer = (target?: Element | string | null): Element | null => {
  if (!target) return null;
  return typeof target === 'string' ? document.querySelector(target) : target;
};

const renderApp = ({ container, basename }: RenderOptions) => {
  if (appRoot) {
    appRoot.unmount();
  }

  appRoot = ReactDOM.createRoot(container);
  appRoot.render(<App basename={basename ?? getBasename()} />);
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
    console.warn('[person-resume-app] mount skipped: container missing');
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
