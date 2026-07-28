import type { HttpMethod } from '@zxkws/shared-fetch';
import { client } from './httpClient';

export type RbacMenu = {
  id: number;
  title: string;
  path?: string;
  icon?: string;
  order: number;
  visible: boolean;
  external: boolean;
  requiresAuth: boolean;
  adminOnly: boolean;
  permission?: string;
  type: 'catalog' | 'menu' | 'button';
  children?: RbacMenu[];
  cts?: string;
  uts?: string;
};

export type RbacPermission = {
  id: number;
  name: string;
  code: string;
  resource?: string;
  action?: string;
  desc?: string;
  enabled: boolean;
  cts?: string;
  uts?: string;
};

export type RbacRole = {
  id: number;
  name: string;
  code: string;
  desc?: string;
  enabled: boolean;
  order: number;
  menus?: RbacMenu[];
  permissions?: RbacPermission[];
  cts?: string;
  uts?: string;
};

export type RbacUser = {
  userId: string;
  username: string;
  email?: string;
  roles?: RbacRole[];
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

const request = async <T>(path: string, method: HttpMethod = 'GET', data?: unknown): Promise<T> => {
  const response = await client<unknown>(path, data ?? {}, { method });
  return unwrap<T>(response);
};

export const rbacService = {
  listMenus: () => request<RbacMenu[]>('/v1/rbac/menus'),
  createMenu: (data: Omit<Partial<RbacMenu>, 'id' | 'children'> & { title: string; parentId?: number | null }) =>
    request<RbacMenu>('/v1/rbac/menus', 'POST', data),
  updateMenu: (id: number, data: Partial<RbacMenu> & { parentId?: number | null }) =>
    request<RbacMenu>(`/v1/rbac/menus/${id}`, 'PATCH', data),
  deleteMenu: (id: number) => request<{ success: boolean }>(`/v1/rbac/menus/${id}`, 'DELETE'),

  listPermissions: () => request<RbacPermission[]>('/v1/rbac/permissions'),
  createPermission: (data: Omit<Partial<RbacPermission>, 'id'> & { name: string; code: string }) =>
    request<RbacPermission>('/v1/rbac/permissions', 'POST', data),
  updatePermission: (id: number, data: Partial<RbacPermission>) =>
    request<RbacPermission>(`/v1/rbac/permissions/${id}`, 'PATCH', data),
  deletePermission: (id: number) => request<{ success: boolean }>(`/v1/rbac/permissions/${id}`, 'DELETE'),

  listRoles: () => request<RbacRole[]>('/v1/rbac/roles'),
  createRole: (data: {
    name: string;
    code: string;
    desc?: string;
    enabled: boolean;
    order: number;
    menuIds: number[];
    permissionIds: number[];
  }) => request<RbacRole>('/v1/rbac/roles', 'POST', data),
  updateRole: (
    id: number,
    data: Partial<RbacRole> & {
      menuIds?: number[];
      permissionIds?: number[];
    },
  ) => request<RbacRole>(`/v1/rbac/roles/${id}`, 'PATCH', data),
  deleteRole: (id: number) => request<{ success: boolean }>(`/v1/rbac/roles/${id}`, 'DELETE'),
  listUsers: () => request<RbacUser[]>('/v1/rbac/users'),
  assignUserRoles: (userId: string, roleIds: number[]) =>
    request<RbacUser>(`/v1/rbac/users/${userId}/roles`, 'POST', { roleIds }),
};
