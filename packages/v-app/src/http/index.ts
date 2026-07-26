import fetch from './fetch';

// 这个 client 没有装剥信封拦截器，拿到的是后端的 { code, data, message }
interface Envelope<T> {
  code: number;
  data: T;
  message: string;
}

interface TodoParams {
  // 传 id 表示更新已有待办；新增时不要传
  id?: string;
  description: string;
}

export interface TodoResponse {
  _id: string;
  description: string;
}

export const queryTodos = (params: Record<string, unknown> = {}) => {
  return fetch<Envelope<TodoResponse[]>>('/v1/todos', params);
};

export const modifyTodo = (params: TodoParams) => {
  return fetch<Envelope<TodoResponse>>('/v1/modifyTodo', params);
};

export const deleteTodo = (params: { id: string }) => {
  return fetch<Envelope<TodoResponse>>('/v1/deleteTodo', params);
};

export const uploadFile = (formData: FormData) => {
  return fetch<void>('/v1/upload/file', formData, { file: true });
};
