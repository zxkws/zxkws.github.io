import { client } from './httpClient';
import type { UserProfile } from './userService';
// 简化类型定义，避免跨仓库依赖
export type UserStatus = 'active' | 'frozen' | 'banned';

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
