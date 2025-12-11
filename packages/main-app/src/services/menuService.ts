import type { MenuItem } from '../types/menu';

const MENU_FILE_PATH = (typeof window !== 'undefined' && (window as any).__MAIN_APP_MENU_FILE__) || '/menus.json';

const normalizeMenus = (list: unknown): MenuItem[] => {
  if (!Array.isArray(list)) return [];

  return list.map((item) => {
    const m = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};

    const rawChildren = (m as { children?: unknown }).children;
    const children = Array.isArray(rawChildren) && rawChildren.length > 0 ? normalizeMenus(rawChildren) : undefined;

    const name = typeof m.title === 'string' ? m.title : typeof m.name === 'string' ? m.name : '';

    return {
      name,
      path: typeof m.path === 'string' ? m.path : undefined,
      icon: typeof m.icon === 'string' ? m.icon : undefined,
      external: typeof m.external === 'boolean' ? m.external : undefined,
      order: typeof m.order === 'number' ? m.order : 0,
      visible: m.visible !== false,
      permission: typeof m.permission === 'string' ? m.permission : null,
      children,
    };
  });
};

/**
 * 获取菜单：已登录用户走 /menu/list（带权限过滤），未登录走 list-public
 */
export async function fetchRemoteMenus(_authenticated: boolean): Promise<MenuItem[]> {
  const res = await fetch(MENU_FILE_PATH, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`Failed to load local menus: ${res.status}`);
  }
  const data = await res.json();
  const list = 'data' in data ? (data as Record<string, unknown>).data : data;
  return normalizeMenus(list || []);
}
