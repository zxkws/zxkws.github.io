import type { MenuItem } from '../types/menu';

const isDev = process.env.NODE_ENV === 'development';
const API_BASE = isDev ? '/api' : 'https://api.zxkws.nyc.mn/api';

const normalizeMenus = (list: any[]): MenuItem[] =>
  (list || []).map((m) => ({
    name: m.title ?? m.name,
    path: m.path,
    icon: m.icon,
    external: m.external,
    order: typeof m.order === 'number' ? m.order : 0,
    visible: m.visible !== false,
    permission: m.permission ?? null,
    children: m.children ? normalizeMenus(m.children) : undefined,
  }));

/**
 * 获取菜单：已登录用户走 /menu/list（带权限过滤），未登录走 list-public
 */
export async function fetchRemoteMenus(authenticated: boolean): Promise<MenuItem[]> {
  const endpoint = authenticated ? '/menu/list' : '/menu/list-public';
  const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load remote menus: ${res.status}`);
  }
  const data = await res.json();
  const list = 'data' in data ? (data as any).data : data;
  return normalizeMenus(list || []);
}
