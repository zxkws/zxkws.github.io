import fetch from './fetch';

interface TodoParams {
  id?: string | number;
  description: string;
  completed?: boolean;
}

export interface TodoResponse {
  _id: string;
  description: string;
  completed?: boolean;
}

interface AccountDto {
  id: number;
  name: string;
  platform: string;
  account: string;
  secret?: string; // usually not returned or hidden
  extra?: any;
  uts: string;
}

interface CreateAccountDto {
  name: string;
  platform: string;
  account?: string;
  secret?: string;
  extra?: any;
}

interface UpdateAccountDto {
  name?: string;
  platform?: string;
  account?: string;
  secret?: string;
  extra?: any;
}

export interface WebsiteDto {
  id: string;
  name: string;
  url: string;
  intervalMinutes: number;
  enabled: boolean;
  lastVisitedAt: string | null;
  nextVisitAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
  cts: string;
  uts: string;
}

export interface SaveWebsiteDto {
  name: string;
  url: string;
  intervalMinutes: number;
  enabled?: boolean;
}

interface ApiResponse<T> {
  data: T;
}

export const queryTodos = (params: Record<string, unknown> = {}) => {
  return fetch<TodoResponse[]>('/v1/todos', params);
};

export const modifyTodo = (params: TodoParams) => {
  return fetch<void>('/v1/modifyTodo', params);
};

export const deleteTodo = (params: { id: string | number }) => {
  return fetch<void>('/v1/deleteTodo', params);
};

export const uploadFile = (formData: FormData) => {
  return fetch<void>('/v1/upload/file', formData, { file: true });
};

// 账户管理API
export const createAccount = (params: CreateAccountDto) => {
  return fetch<void>('/v1/account-manage', params);
};

export const getAccounts = () => {
  return fetch<AccountDto[]>('/v1/account-manage', {});
};

export const getAccount = (id: number) => {
  return fetch<AccountDto>(`/v1/account-manage/${id}`, {});
};

export const updateAccount = (id: number, params: UpdateAccountDto) => {
  return fetch<void>(`/v1/account-manage/${id}`, params, { method: 'PATCH' });
};

export const deleteAccount = (id: number) => {
  return fetch<void>(`/v1/account-manage/${id}`, {}, { method: 'DELETE' });
};

export const getWebsites = () =>
  fetch<ApiResponse<WebsiteDto[]>>('/v1/websites', {}, { method: 'GET' }).then((response) => response.data);

export const createWebsite = (params: SaveWebsiteDto) =>
  fetch<ApiResponse<WebsiteDto>>('/v1/websites', params).then((response) => response.data);

export const updateWebsite = (id: string, params: Partial<SaveWebsiteDto>) =>
  fetch<ApiResponse<WebsiteDto>>(`/v1/websites/${id}`, params, { method: 'PATCH' }).then(
    (response) => response.data,
  );

export const deleteWebsite = (id: string) =>
  fetch<void>(`/v1/websites/${id}`, {}, { method: 'DELETE' });
