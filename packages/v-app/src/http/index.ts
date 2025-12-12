import fetch from './fetch';

interface LoginParams {
  username?: string;
  email?: string;
  password: string;
}

interface RegisterParams {
  username: string;
  password: string;
  email?: string;
}

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
  account: string;
  password: string;
  remark?: string;
}

interface CreateAccountDto {
  account: string;
  password: string;
  remark?: string;
}

interface UpdateAccountDto {
  account?: string;
  password?: string;
  remark?: string;
}

export const login = (params: LoginParams) => {
  return fetch<string>('/v1/user/login', params);
};

export const register = (params: RegisterParams) => {
  return fetch<string>('/v1/user/register', params);
};

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
  return fetch<void>('/v1/upload', formData, { file: true });
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
