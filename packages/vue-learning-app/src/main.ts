import { createApp, type App as VueApp } from 'vue';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';

import App from './App.vue';
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

let appInstance: VueApp<Element> | null = null;
setLibraryName('vue-learning-app');

const resolveContainer = (target?: Element | string | null): Element | null => {
  if (!target) {
    return null;
  }
  if (typeof target === 'string') {
    return document.querySelector(target);
  }
  return target;
};

const renderApp = ({ container, basename }: RenderOptions) => {
  appInstance = createApp(App, {
    base: basename ?? getBasename(),
  });
  appInstance.mount(container);
};

export const unmount = async () => {
  const instance = appInstance as (VueApp<Element> & { _container?: Element | null }) | null;
  if (instance?._container) {
    instance.unmount();
  }
  appInstance = null;
};

export const mount = async (options: MountOptions = {}) => {
  const { container, basename, customProps } = options;
  const fallbackSelector = isInIcestark() ? undefined : '#app';
  const containerSource = container ?? customProps?.container ?? fallbackSelector;
  const target = resolveContainer(containerSource);

  if (!target) {
    console.warn('[vue-learning-app] mount skipped: container missing');
    return;
  }

  if (appInstance) {
    await unmount();
  }

  renderApp({
    container: target,
    basename: basename ?? customProps?.basename,
  });
};

if (!isInIcestark()) {
  const container = resolveContainer('#app');
  if (container) {
    renderApp({ container, basename: import.meta.env.BASE_URL });
  }
}
