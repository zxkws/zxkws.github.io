import type { MenuItem } from '../types/menu';

const isDev = process.env.NODE_ENV === 'development';
const API_BASE = isDev ? '/api' : 'https://api.zxkws.nyc.mn/api';

export async function fetchRemoteMenus(): Promise<MenuItem[]> {
  const res = await fetch(`${API_BASE}/menu/list-public`, { method: 'POST', credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load remote menus: ${res.status}`);
  }
  const data = await res.json();
  const list = 'data' in data ? data.data : data;
  return (list || []).map((m: any) => ({
    name: m.title,
    path: m.path,
    icon: m.icon,
    external: m.external,
    order: typeof m.order === 'number' ? m.order : 0,
    visible: m.visible !== false,
  }));
}
