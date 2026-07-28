import { client } from './httpClient';

export type UserStatus = 'active' | 'frozen' | 'banned';

export type AdminRole = {
  id?: number;
  code?: string;
  name?: string;
};

export type AdminUser = {
  userId: string;
  username: string;
  email?: string | null;
  phone?: string | null;
  status: UserStatus;
  roles?: AdminRole[];
  cts?: string;
  uts?: string;
};

export type CreateAdminUserPayload = {
  username: string;
  email: string;
  password: string;
};

export type UpdateAdminUserPayload = {
  username?: string;
  email?: string;
  status?: UserStatus;
};

export const fetchUsers = async (keyword?: string) => {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return client<AdminUser[]>(`/v1/user/list${query}`, {}, { method: 'GET' });
};

export const createUser = (data: CreateAdminUserPayload) => client<AdminUser>('/v1/user', data, { method: 'POST' });

export const updateUser = (id: string, data: UpdateAdminUserPayload) =>
  client<AdminUser>(`/v1/user/${id}/admin`, data, { method: 'PATCH' });

export const resetUserPassword = (id: string, password: string) =>
  client<{ userId: string }>(`/v1/user/${id}/password`, { password }, { method: 'PATCH' });

export const updateStatus = (id: string, status: UserStatus) =>
  client<AdminUser>(`/v1/user/${id}/status`, { status }, { method: 'PATCH' });

export const deleteUser = (id: string) => client(`/v1/user/${id}`, {}, { method: 'DELETE' });
