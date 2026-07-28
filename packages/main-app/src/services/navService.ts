import { backgroundClient, client } from './httpClient';

export type NavItem = {
  id: string;
  name: string;
  url: string;
  category?: string | null;
  sort?: number;
};

export type NavItemPayload = {
  name: string;
  url: string;
  category?: string;
  sort?: number;
};

const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export const fetchNavItems = async () => {
  const res = await backgroundClient<unknown>('/v1/nav-items', undefined, { method: 'GET' });
  const list = unwrap<NavItem[]>(res);
  return Array.isArray(list) ? list : [];
};

export const createNavItem = async (payload: NavItemPayload) => {
  const res = await client<unknown>('/v1/nav-items', payload, { method: 'POST' });
  return unwrap<NavItem>(res);
};

export const updateNavItem = async (id: string, payload: Partial<NavItemPayload>) => {
  const res = await client<unknown>(`/v1/nav-items/${id}`, payload, { method: 'PATCH' });
  return unwrap<NavItem>(res);
};

export const deleteNavItem = async (id: string) => {
  await client<unknown>(`/v1/nav-items/${id}`, undefined, { method: 'DELETE' });
};
