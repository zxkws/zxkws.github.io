import { createApp, type App as RootApp } from 'vue';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';
import '@surely-vue/table/dist/index.less';
import STable, { setLicenseKey } from '@surely-vue/table';

import App from './App.vue';
import '@zxkws/shared-theme/theme.css';
import './style/tailwind.css';
import './style/style.css';

import { createPinia, type Pinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

import { createRouterInstance } from './router';
import { mainStore } from './store';

type MountOptions = {
  container?: Element | string;
  basename?: string;
  customProps?: {
    basename?: string;
    isMicroApp?: boolean;
    container?: Element | string;
  };
};

type RenderOptions = {
  container: Element;
  basename?: string;
};

let appInstance: RootApp<Element> | null = null;
setLibraryName('v-app');
let piniaInstance: Pinia | null = null;

const resolveContainer = (target?: Element | string): Element | null => {
  if (!target) {
    return null;
  }
  if (typeof target === 'string') {
    return document.querySelector(target);
  }
  return target;
};

const registerTokenFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  if (token) {
    localStorage.setItem('auth_token', token);
    const newUrl = window.location.origin + window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', newUrl);
  }
};

const renderApp = ({ container, basename }: RenderOptions) => {
  registerTokenFromQuery();

  appInstance = createApp(App);
  setLicenseKey(
    '0b50c5c2999298c91d183c696087eb90T1JERVI6MDAwMDEsRVhQSVJZPTQxMDIzNTg0MDAwMDAsRE9NQUlOPV8sS0VZVkVSU0lPTj0xLFVMVElNQVRFPTE=',
  );

  piniaInstance = createPinia();
  piniaInstance.use(piniaPluginPersistedstate);

  appInstance.use(STable);
  appInstance.use(piniaInstance);

  const router = createRouterInstance(basename ?? getBasename());
  appInstance.use(router);

  const store = mainStore(piniaInstance);
  store.setMicroAppMode(isInIcestark());

  router.beforeEach((_to, _from, next) => {
    store.isLoading = true;
    // 展示全局 loading 遮罩，避免首屏页面停留在默认 true 状态
    store.setLoading(true);
    next();
  });

  router.afterEach(() => {
    // 路由就绪后统一关闭 loading
    store.isLoading = false;
    store.setLoading(false);
  });

  appInstance.mount(container);
};

export const unmount = async () => {
  // Guard against unmount being triggered before mount finishes (prefetch, rapid toggles, etc.)
  const instance = appInstance as (RootApp<Element> & { _container?: Element | null }) | null;
  if (instance?._container) {
    instance.unmount();
  }
  appInstance = null;
  piniaInstance = null;
};

export const mount = async (options: MountOptions = {}) => {
  const { container, basename, customProps } = options;
  const fallbackSelector = isInIcestark() ? undefined : '#app';
  const containerSource = container ?? customProps?.container ?? fallbackSelector;
  if (!containerSource) {
    // Prefetch phase inside icestark where no container is provided yet
    return;
  }
  const target = resolveContainer(containerSource);
  if (!target) {
    console.error('[v-app] mount container not found', containerSource);
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
  renderApp({
    container: resolveContainer('#app')!,
    basename: import.meta.env.BASE_URL,
  });
}
