import menusFile from '../config/menus.json';
import type { MenuItem } from '../types/menu';

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
      adminOnly: m.adminOnly === true,
      requiresAuth: m.requiresAuth === true,
      children,
    };
  });
};

/**
 * 获取菜单：直接使用打包内置 JSON
 */
export async function fetchRemoteMenus(_authenticated: boolean): Promise<MenuItem[]> {
  const list = (menusFile as unknown) ?? [];
  return normalizeMenus(list);
}
