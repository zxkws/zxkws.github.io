import fetch from "./fetch";
export const login = (params) => {
  return fetch("/v1/login", params);
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
