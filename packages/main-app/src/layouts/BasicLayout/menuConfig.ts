import type { MenuItem } from '../../types/menu';

const headerMenuConfig: MenuItem[] = [];

const staticMenuConfig: MenuItem[] = [
  {
    name: 'Home',
    path: '/',
    icon: 'chart-pie',
  },
  {
    name: 'About',
    path: '/about',
    icon: 'chart-pie',
  },
  {
    name: 'Login',
    path: '/login',
    icon: 'account',
  },
  {
    name: 'Curl Converter',
    path: '/curlconverter',
    icon: 'set',
  },
];

const getMicroAppMenus = (): MenuItem[] => {
  if (typeof window === 'undefined' || !window.__MICRO_APP_MENUS__) {
    return [];
  }

  return window.__MICRO_APP_MENUS__.map((config) => {
    const displayName =
      config.appName === 'v-app' ? 'Vue 应用' : config.appName === 'textdiff' ? '文本对比' : config.appName;
    return {
      name: displayName,
      icon: 'atm',
      children: config.menus,
    };
  });
};

let cachedMenus: MenuItem[] | null = null;

const getAsideMenuConfig = (): MenuItem[] => {
  if (cachedMenus) {
    return cachedMenus;
  }

  const microMenus = getMicroAppMenus();
  cachedMenus = [...staticMenuConfig, ...microMenus];
  return cachedMenus;
};

export const refreshMenus = () => {
  cachedMenus = null;
};

const asideMenuConfig = getAsideMenuConfig();

export { headerMenuConfig, asideMenuConfig, getAsideMenuConfig };
