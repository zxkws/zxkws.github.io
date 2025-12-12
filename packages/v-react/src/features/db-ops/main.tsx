import ReactDOM from 'react-dom/client';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';
import App from './App';
import './styles.css';

setLibraryName('db-ops-app');

let appRoot: ReactDOM.Root | null = null;

const resolveContainer = (target?: Element | string | null) => {
  if (!target) return null;
  return typeof target === 'string' ? document.querySelector(target) : target;
};

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
  const fallbackSelector = isInIcestark() ? undefined : '#db-ops-app-root';
  const containerSource = container ?? customProps?.container ?? fallbackSelector;
  const target = resolveContainer(containerSource);
  if (!target) return;
  renderApp({ container: target, basename: basename ?? customProps?.basename });
};

if (!isInIcestark()) {
  mount({ container: '#db-ops-app-root', basename: import.meta.env.BASE_URL });
}
