import { createFetchClient } from '@zxkws/shared-fetch';
import type { UserProfile } from './userService';
import type { UserStatus } from '../../../monorepo-server-admin/packages/nest-admin/src/user/entities/user.entity'; // rely on string literal union

const client = createFetchClient({
  baseURL: process.env.NODE_ENV === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api',
  credentials: 'include',
});

export type AdminUser = UserProfile & {
  email?: string;
  status?: UserStatus;
};

export const fetchUsers = async (keyword?: string) => {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return client<AdminUser[]>(`/v1/user/list${query}`, {}, { method: 'GET' });
};

export const updateUser = (id: string, data: Partial<AdminUser>) =>
  client(`/v1/user/${id}/admin`, data, { method: 'PATCH' });

export const updateStatus = (id: string, status: UserStatus) =>
  client(`/v1/user/${id}/status`, { status }, { method: 'PATCH' });

export const deleteUser = (id: string) => client(`/v1/user/${id}`, { id }, { method: 'DELETE' });
