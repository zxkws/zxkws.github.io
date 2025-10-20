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
  const configUrl = getConfigUrl();
  const response = await fetch(configUrl);
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
  }
  const config = await response.json();
  return {
    ...config,
    updatedAt: new Date(config.updatedAt),
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
      path: app.activeRule?.[0] ?? '/',
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
