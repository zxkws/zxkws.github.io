import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import isInIcestark from '@ice/stark-app/lib/isInIcestark';
import getBasename from '@ice/stark-app/lib/getBasename';
import setLibraryName from '@ice/stark-app/lib/setLibraryName';

setLibraryName('auth-app');

let appInstance: ReturnType<typeof createApp> | null = null;

const mount = ({ container, basename }: { container?: Element | string; basename?: string } = {}) => {
  const target = typeof container === 'string' ? document.querySelector(container) : container;
  const mountPoint = target ?? document.getElementById('app');
  if (!mountPoint) {
    throw new Error('auth-app: mount container not found');
  }
  appInstance = createApp(App);
  appInstance.use(router);
  appInstance.mount(mountPoint);
};

const unmount = () => {
  if (appInstance) {
    appInstance.unmount();
    appInstance = null;
  }
};

if (!isInIcestark()) {
  mount({ container: '#app', basename: getBasename() });
}

export { mount, unmount };
