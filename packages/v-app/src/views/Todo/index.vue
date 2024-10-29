<script setup lang="ts">
import { deleteTodo, modifyTodo, queryTodos } from "@/http";
import { mainStore } from "@/store";
const store = mainStore();

const todoParams = ref("");

type todoType = { _id: string; description: string };

const todos = ref<todoType[]>([]);

onMounted(() => {
  queryTodo();
});

const queryTodo = () => {
  store.setLoading(true, "查询todo....");
  queryTodos({})
    .then((res) => {
      todos.value = res;
    })
    .finally(() => {
      store.setLoading(false);
    });
};

const add = () => {
  modifyTodo({
    description: todoParams.value,
  }).then(() => {
    todoParams.value = "";
    queryTodo();
  });
};

const deleteItem = (id: string) => {
  deleteTodo({ id }).then((res) => {
    queryTodo();
  });
};
</script>

<template>
  <div class="flex flex-col h-screen mx-auto p-6 bg-white shadow-lg rounded-lg">
    <h2 class="text-xl font-semibold p-4 border-b border-gray-200">
      Todo List
    </h2>
    <ul class="flex-1 overflow-y-auto space-y-4 p-4">
      <li
        v-for="todo in todos"
        :key="todo._id"
        class="flex items-start p-4 bg-gray-100 border border-gray-300 rounded-lg"
      >
        <p class="fflex-1 text-gray-700 break-words overflow-hidden">
          {{ todo.description }}
        </p>
        <button
          class="ml-4 px-3 py-1 text-white bg-red-500 rounded-lg hover:bg-red-600 flex-shrink-0"
          @click="() => deleteItem(todo._id)"
        >
          delete
        </button>
      </li>
    </ul>
    <div
      class="flex items-center p-4 border-t border-gray-200 bg-white sticky bottom-0"
    >
      <textarea
        class="flex-1 resize-none p-2 text-black border border-gray-300 rounded-lg mr-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        rows="1"
        placeholder="输入新的 Todo..."
        v-model="todoParams"
      ></textarea>
      <button
        @click="add"
        class="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600"
      >
        添加
      </button>
    </div>
  </div>
</template>
