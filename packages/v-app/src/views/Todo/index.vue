<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { deleteTodo, modifyTodo, queryTodos, type TodoResponse } from '@/http';
import { mainStore } from '@/store';

const store = mainStore();

const todoParams = ref('');

const todos = ref<TodoResponse[]>([]);

const displayTodos = computed(() =>
  todos.value.map((item) => ({
    ...item,
    description: item.description?.trim() || '（未填写内容）',
  })),
);

onMounted(() => {
  queryTodo();
});

const queryTodo = () => {
  store.setLoading(true, '查询todo....');
  queryTodos({})
    .then((res) => {
      todos.value = res.data || [];
    })
    .finally(() => {
      store.setLoading(false);
    });
};

const add = () => {
  modifyTodo({
    id: Date.now(),
    description: todoParams.value,
  }).then(() => {
    todoParams.value = '';
    queryTodo();
  });
};

const deleteItem = (id: string) => {
  deleteTodo({ id }).then(() => {
    queryTodo();
  });
};
</script>

<template>
  <div class="todo-page">
    <header class="todo-header">
      <h2>Todo List</h2>
      <p class="hint">已按用户隔离存储，当前仅展示你的任务</p>
    </header>

    <section class="todo-list" v-if="displayTodos.length">
      <article v-for="todo in displayTodos" :key="todo._id" class="todo-item">
        <p class="todo-text">{{ todo.description }}</p>
        <button class="todo-delete" @click="() => deleteItem(todo._id)">删除</button>
      </article>
    </section>
    <section v-else class="todo-empty">暂无待办，添加一条吧~</section>

    <footer class="todo-input-bar">
      <textarea class="todo-input" rows="1" placeholder="输入新的 Todo..." v-model="todoParams"></textarea>
      <button @click="add" class="todo-add">添加</button>
    </footer>
  </div>
</template>

<style scoped>
.todo-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 24px 32px;
  background: var(--color-bg, #0f172a);
  color: var(--color-text, #e2e8f0);
}

.todo-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.todo-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-muted, #94a3b8);
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 200px;
}

.todo-item {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: var(--card-bg, rgba(15, 23, 42, 0.55));
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  box-shadow: 0 10px 30px -20px rgba(0, 0, 0, 0.5);
}

.todo-text {
  flex: 1;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text, #e2e8f0);
  word-break: break-word;
}

.todo-delete {
  border: none;
  padding: 8px 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}

.todo-delete:hover {
  transform: translateY(-1px);
  opacity: 0.92;
}

.todo-empty {
  padding: 24px;
  text-align: center;
  color: var(--color-muted, #94a3b8);
  background: var(--card-bg, rgba(15, 23, 42, 0.4));
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 12px;
}

.todo-input-bar {
  display: flex;
  gap: 10px;
  padding: 14px;
  background: var(--card-bg, rgba(15, 23, 42, 0.55));
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  position: sticky;
  bottom: 12px;
  backdrop-filter: blur(8px);
}

.todo-input {
  flex: 1;
  resize: none;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: transparent;
  color: var(--color-text, #e2e8f0);
  font-size: 14px;
}

.todo-input:focus {
  outline: none;
  border-color: var(--accent, #38bdf8);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.35);
}

.todo-add {
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent, #38bdf8), #2563eb);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.todo-add:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 30px -18px rgba(37, 99, 235, 0.8);
}

@media (max-width: 900px) {
  .todo-page {
    padding: 16px;
  }
  .todo-item {
    align-items: flex-start;
  }
}
</style>
