import type { SystemConfig, MicroAppConfig, MenuConfig, UserPermissions } from '../types/config';
import type { MenuItem } from '../types/menu';

const isDevelopment = process.env.NODE_ENV === 'development';

const getConfigUrl = () => {
  if (isDevelopment) {
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:5175/micro-apps.json`;
    }
    return 'http://127.0.0.1:5175/micro-apps.json';
  }
  return `${window.location.origin}/config-center/micro-apps.json`;
};

/**
 * 从配置中心加载配置
 */
export async function loadSystemConfig(): Promise<SystemConfig> {
  try {
    const configUrl = getConfigUrl();
    const response = await fetch(configUrl);
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }
    const config = await response.json();
    return {
      ...config,
      updatedAt: new Date(config.updatedAt),
    };
  } catch (error) {
    console.error('[ConfigService] Failed to load system config:', error);
    return getFallbackConfig();
  }
}

/**
 * 降级配置（服务端不可用时使用）
 */
function getFallbackConfig(): SystemConfig {
  return {
    version: '1.0.0',
    microApps: [
      {
        id: 'v-app',
        name: 'v-app',
        displayName: 'Vue 应用',
        entry: '/v-app/',
        devEntry: 'http://localhost:5173',
        prodEntry: 'https://zxkws.nyc.mn/v-app/',
        activeRule: ['/v-app'],
        enabled: true,
        sandbox: true,
        loadScriptMode: 'import',
        menu: {
          id: 'v-app-menu',
          name: 'Vue 应用',
          icon: '⚡',
          type: 'group',
          visible: true,
          source: 'static',
          children: [
            {
              id: 'v-app-navlist',
              name: '导航列表',
              path: '/v-app/navList',
              icon: '🏠',
              type: 'item',
              visible: true,
              source: 'static',
            },
            {
              id: 'v-app-todo',
              name: 'Todo',
              path: '/v-app/todo',
              icon: '✅',
              type: 'item',
              visible: true,
              source: 'static',
            },
            {
              id: 'v-app-account',
              name: '账户管理',
              path: '/v-app/account',
              icon: '👤',
              type: 'item',
              visible: true,
              source: 'static',
            },
            {
              id: 'v-app-llm-ranking',
              name: 'LLM 排名',
              path: '/v-app/llm-ranking',
              icon: '📊',
              type: 'item',
              visible: true,
              source: 'static',
            },
          ],
        },
        order: 1,
      },
      {
        id: 'textdiff',
        name: 'textdiff',
        displayName: '文本对比',
        entry: '/textdiff/',
        devEntry: 'http://localhost:5174',
        prodEntry: 'https://zxkws.nyc.mn/textdiff/',
        activeRule: ['/textdiff'],
        enabled: true,
        iframe: true,
        menu: {
          id: 'textdiff-menu',
          name: '文本对比',
          icon: '📝',
          type: 'item',
          path: '/textdiff/',
          visible: true,
          source: 'static',
        },
        order: 2,
      },
      {
        id: 'curlconverter',
        name: 'curlconverter',
        displayName: 'Curl Converter',
        entry: 'https://curlconverter.com/',
        devEntry: 'https://curlconverter.com/',
        prodEntry: 'https://curlconverter.com/',
        activeRule: ['/curlconverter'],
        enabled: true,
        iframe: true,
        menu: {
          id: 'curlconverter-menu',
          name: 'Curl Converter',
          icon: '🧩',
          type: 'item',
          path: '/curlconverter',
          visible: true,
          source: 'static',
        },
        order: 3,
      },
    ],
    standaloneMenus: [],
    updatedAt: new Date(),
  };
}

/**
 * 转换微应用配置为 ice-stark 格式
 */
export function convertToIceStarkApps(config: SystemConfig) {
  const resolveEntry = (app: MicroAppConfig) =>
    isDevelopment ? app.devEntry || app.entry : app.prodEntry || app.entry;

  return config.microApps
    .filter((app) => app.enabled)
    .map((app) => ({
      name: app.name,
      title: app.displayName,
      entry: resolveEntry(app),
      activePath: app.activeRule,
      sandbox: app.sandbox ?? true,
      loadScriptMode: app.loadScriptMode || 'import',
      iframe: app.iframe,
    }));
}

/**
 * 生成菜单配置
 */
export function generateMenusFromConfig(config: SystemConfig, userPermissions?: UserPermissions): MenuItem[] {
  const microAppMenus: MenuItem[] = config.microApps
    .filter((app) => app.enabled && app.menu)
    .map((app) => convertMenuConfigToMenuItem(app));

  const standaloneMenus: MenuItem[] = (config.standaloneMenus || []).map((menu) => ({
    name: menu.name,
    path: menu.path,
    icon: menu.icon,
    children: menu.children?.map((child) => ({
      name: child.name,
      path: child.path,
      icon: child.icon,
    })),
  }));

  const allMenus = [...microAppMenus, ...standaloneMenus].sort((a, b) => {
    const orderA = (a as { order?: number }).order || 0;
    const orderB = (b as { order?: number }).order || 0;
    return orderA - orderB;
  });

  if (userPermissions) {
    return filterMenusByPermissions(allMenus, userPermissions);
  }

  return allMenus;
}

/**
 * 转换菜单配置为 MenuItem
 */
function convertMenuConfigToMenuItem(app: MicroAppConfig): MenuItem {
  if (!app.menu) {
    return {
      name: app.displayName,
      path: app.activeRule[0],
    };
  }

  return {
    name: app.menu.name,
    path: app.menu.path,
    icon: app.menu.icon,
    order: app.menu.order,
    children: app.menu.children?.map((child) => ({
      name: child.name,
      path: child.path,
      icon: child.icon,
      order: child.order,
    })),
  } as MenuItem;
}

/**
 * 权限过滤
 */
function filterMenusByPermissions(menus: MenuItem[], userPermissions: UserPermissions): MenuItem[] {
  return menus
    .filter((menu) => {
      const menuConfig = menu as MenuConfig;
      if (!menuConfig.permissions || menuConfig.permissions.length === 0) {
        return true;
      }
      return menuConfig.permissions.some((p) => userPermissions.permissions.includes(p));
    })
    .map((menu) => ({
      ...menu,
      children: menu.children ? filterMenusByPermissions(menu.children, userPermissions) : undefined,
    }));
}

/**
 * 合并配置菜单和微应用暴露的菜单
 */
export function mergeMenus(configMenus: MenuItem[], microAppMenus: MenuItem[]): MenuItem[] {
  const menuMap = new Map<string, MenuItem>();

  configMenus.forEach((menu) => {
    if (menu.name) {
      menuMap.set(menu.name, menu);
    }
  });

  microAppMenus.forEach((menu) => {
    const existing = menuMap.get(menu.name);
    if (existing) {
      menuMap.set(menu.name, {
        ...existing,
        ...menu,
        children: menu.children || existing.children,
      });
    } else {
      menuMap.set(menu.name, menu);
    }
  });

  return Array.from(menuMap.values());
}
