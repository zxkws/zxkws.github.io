export interface MenuItem {
  name: string;
  path?: string;
  icon?: string;
  children?: MenuItem[];
  external?: boolean;
}

export const menuConfig: MenuItem[] = [
  {
    name: '导航列表',
    path: '/v-app/navList',
    icon: '🏠',
  },
  {
    name: 'Todo',
    path: '/v-app/todo',
    icon: '✅',
  },
  {
    name: '账户管理',
    path: '/v-app/account',
    icon: '👤',
  },
  {
    name: 'LLM 排名',
    path: '/v-app/llm-ranking',
    icon: '📊',
  },
];

export const exposeMenuToHost = (basename = '/v-app') => {
  if (typeof window === 'undefined') {
    return;
  }

  const menus = menuConfig.map((item) => ({
    ...item,
    path: item.path || `${basename}${item.path}`,
  }));

  if (!window.__MICRO_APP_MENUS__) {
    window.__MICRO_APP_MENUS__ = [];
  }

  const existingIndex = window.__MICRO_APP_MENUS__.findIndex((config) => config.appName === 'v-app');

  if (existingIndex >= 0) {
    window.__MICRO_APP_MENUS__[existingIndex] = {
      appName: 'v-app',
      menus,
    };
  } else {
    window.__MICRO_APP_MENUS__.push({
      appName: 'v-app',
      menus,
    });
  }
};

declare global {
  interface Window {
    __MICRO_APP_MENUS__?: Array<{
      appName: string;
      menus: MenuItem[];
    }>;
  }
}
