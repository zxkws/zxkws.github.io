<script setup lang="ts">
import { deleteTodo, modifyTodo, queryTodos } from "../../http";

const todoParams = ref("");

const todos = ref([]);

onMounted(() => {
  queryTodo();
});

const queryTodo = () => {
  queryTodos({}).then((res) => {
    todos.value = res;
  });
};

const add = () => {
  modifyTodo({
    description: todoParams.value,
  }).then((res) => {
    console.log(res);
    todoParams.value = "";
    queryTodo();
  });
};

const deleteItem = (id) => {
  deleteTodo({ id }).then((res) => {
    console.log(res);
    queryTodo();
  });
};
</script>

<template>
  <ul>
    <li v-for="todo in todos" :key="todo.id">
      {{ todo.description }}
      <button class="border" @click="() => deleteItem(todo._id)">delete</button>
    </li>
  </ul>
  <div>
    <textarea class="text-black" v-model="todoParams"></textarea>
    <button @click="add">添加todo</button>
  </div>
</template>
