import type { MenuItem } from '../../types/menu';

const headerMenuConfig: MenuItem[] = [];

const asideMenuConfig: MenuItem[] = [
  { name: '首页', path: '/' },
  {
    name: 'Vue 应用',
    path: '/v-app',
    children: [
      { name: '导航列表', path: '/v-app/navList' },
      { name: 'Todo', path: '/v-app/todo' },
      { name: '账户管理', path: '/v-app/account' },
      { name: 'LLM 排名', path: '/v-app/llm-ranking' },
    ],
  },
  { name: '文本对比', path: '/textdiff' },
  { name: 'Curl Converter', path: '/curlconverter' },
  { name: '配置中心', path: '/config-hub' },
  { name: '关于', path: '/about' },
];

export const getAsideMenuConfig = (): MenuItem[] => asideMenuConfig;

export { headerMenuConfig, asideMenuConfig };
