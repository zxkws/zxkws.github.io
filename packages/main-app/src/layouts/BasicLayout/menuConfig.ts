import type { MenuItem } from '../../types/menu';
import { getSystemConfig } from '../../core/icestark';
import { generateMenusFromConfig, mergeMenus } from '../../services/configService';

const headerMenuConfig: MenuItem[] = [];

const staticMenuConfig: MenuItem[] = [
  {
    name: 'Home',
    path: '/',
    icon: 'chart-pie',
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

  const config = getSystemConfig();
  console.log('[MenuConfig] System config:', config);

  if (config) {
    const configMenus = generateMenusFromConfig(config);
    console.log('[MenuConfig] Config menus:', configMenus);

    const microMenus = getMicroAppMenus();
    console.log('[MenuConfig] Micro menus:', microMenus);

    const mergedMenus = mergeMenus(configMenus, microMenus);
    console.log('[MenuConfig] Merged menus:', mergedMenus);

    cachedMenus = [...staticMenuConfig, ...mergedMenus];
  } else {
    const microMenus = getMicroAppMenus();
    cachedMenus = [...staticMenuConfig, ...microMenus];
  }

  console.log('[MenuConfig] Final cached menus:', cachedMenus);
  return cachedMenus;
};

export const refreshMenus = () => {
  cachedMenus = null;
};

const asideMenuConfig = getAsideMenuConfig();

export { headerMenuConfig, asideMenuConfig, getAsideMenuConfig };
