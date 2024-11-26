import fetch from "./fetch";
export const login = (params) => {
  return fetch("/v1/user/login", params);
};

export const register = (params) => {
  return fetch("/v1/user/register", params);
};

export const queryTodos = (params) => {
  return fetch("/v1/todos", params);
};

export const modifyTodo = (params) => {
  return fetch("/v1/modifyTodo", params);
};

export const deleteTodo = (params) => {
  return fetch("/v1/deleteTodo", params);
};

export const uploadFile = (formData) => {
  return fetch("/v1/upload", formData, { file: true });
};
