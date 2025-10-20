import type { MenuItem } from '../../types/menu';

const headerMenuConfig: MenuItem[] = [];

const asideMenuConfig: MenuItem[] = [
  { name: '首页', path: '/' },
  { name: 'Vue 应用', path: '/v-app' },
  { name: '文本对比', path: '/textdiff' },
  { name: 'Curl Converter', path: '/curlconverter' },
  { name: '配置中心', path: '/config-hub' },
  { name: '关于', path: '/about' },
];

export const getAsideMenuConfig = (): MenuItem[] => asideMenuConfig;

export { headerMenuConfig, asideMenuConfig };
