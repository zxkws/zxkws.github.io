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
