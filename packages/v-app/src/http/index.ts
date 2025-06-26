import fetch from "./fetch";

interface LoginParams {
  username: string;
  password: string;
}

interface RegisterParams {
  username: string;
  password: string;
  email?: string;
}

interface TodoParams {
  id?: number;
  title: string;
  completed?: boolean;
}

interface FileUploadParams {
  file: File;
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
  return fetch("/v1/user/login", params);
};

export const register = (params: RegisterParams) => {
  return fetch("/v1/user/register", params);
};

export const queryTodos = (params: {}) => {
  return fetch("/v1/todos", params);
};

export const modifyTodo = (params: TodoParams) => {
  return fetch("/v1/modifyTodo", params);
};

export const deleteTodo = (params: { id: number }) => {
  return fetch("/v1/deleteTodo", params);
};

export const uploadFile = (formData: FormData) => {
  return fetch("/v1/upload", formData, { file: true });
};

// 账户管理API
export const createAccount = (params: CreateAccountDto) => {
  return fetch("/account-manage/create", params);
};

export const getAccounts = () => {
  return fetch("/account-manage/list", {});
};

export const getAccount = (id: number) => {
  return fetch(`/account-manage/detail`, {id});
};

export const updateAccount = (id: number, params: UpdateAccountDto) => {
  return fetch(`/account-manage/update`, {id, ...params}, { method: "PATCH" });
};

export const deleteAccount = (id: number) => {
  return fetch(`/account-manage/$remove`, {id}, { method: "DELETE" });
};
