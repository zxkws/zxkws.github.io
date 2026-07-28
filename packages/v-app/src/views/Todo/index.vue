<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { deleteTodo, modifyTodo, queryTodos, type TodoResponse } from '@/http';
import { mainStore } from '@/store';

const store = mainStore();
const todoParams = ref('');
const todos = ref<TodoResponse[]>([]);
const errorMessage = ref('');
const submitting = ref(false);
const deletingId = ref<string | null>(null);

const toMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const queryTodo = async () => {
  store.setLoading(true, '正在加载待办…');
  errorMessage.value = '';
  try {
    const response = await queryTodos({});
    todos.value = Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    errorMessage.value = `加载待办失败：${toMessage(error)}`;
  } finally {
    store.setLoading(false);
  }
};

const add = async () => {
  if (!todoParams.value.trim()) {
    errorMessage.value = '请输入待办内容';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';
  try {
    await modifyTodo({ description: todoParams.value });
    todoParams.value = '';
    await queryTodo();
  } catch (error) {
    errorMessage.value = `添加待办失败：${toMessage(error)}`;
  } finally {
    submitting.value = false;
  }
};

const deleteItem = async (id: string) => {
  deletingId.value = id;
  errorMessage.value = '';
  try {
    await deleteTodo({ id });
    await queryTodo();
  } catch (error) {
    errorMessage.value = `删除待办失败：${toMessage(error)}`;
  } finally {
    deletingId.value = null;
  }
};

onMounted(queryTodo);
</script>

<template>
  <main class="todo-page">
    <header class="todo-header">
      <div>
        <p class="todo-eyebrow">Personal queue</p>
        <h1>待办事项</h1>
        <p class="todo-description">任务按当前账号隔离保存，列表内容保持后端返回值原样展示。</p>
      </div>
      <span class="todo-count">{{ todos.length }} items</span>
    </header>

    <p v-if="errorMessage" class="todo-error" role="alert">{{ errorMessage }}</p>

    <section class="todo-panel">
      <div v-if="todos.length" class="todo-list">
        <article v-for="todo in todos" :key="todo._id" class="todo-item">
          <p class="todo-text">{{ todo.description }}</p>
          <button class="todo-delete" type="button" :disabled="deletingId === todo._id" @click="deleteItem(todo._id)">
            {{ deletingId === todo._id ? '删除中…' : '删除' }}
          </button>
        </article>
      </div>
      <div v-else class="todo-empty">
        <strong>暂无待办</strong>
        <span>在下方输入第一条任务。</span>
      </div>
    </section>

    <form class="todo-input-bar" @submit.prevent="add">
      <label for="todo-description">新增待办</label>
      <div class="todo-compose">
        <textarea
          id="todo-description"
          v-model="todoParams"
          class="todo-input"
          rows="2"
          placeholder="输入待办内容"
          @keydown.meta.enter.prevent="add"
          @keydown.ctrl.enter.prevent="add"
        />
        <button type="submit" class="todo-add" :disabled="submitting">
          {{ submitting ? '添加中…' : '添加待办' }}
        </button>
      </div>
      <span class="todo-shortcut">⌘ / Ctrl + Enter 快速添加</span>
    </form>
  </main>
</template>

<style scoped>
.todo-page {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  gap: 20px;
  padding: 32px;
  background: var(--color-canvas);
  color: var(--color-fg);
}

.todo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.todo-eyebrow {
  margin: 0 0 8px;
  color: var(--color-primary-deep);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.todo-header h1 {
  margin: 0;
  font-size: clamp(24px, 3vw, 32px);
  letter-spacing: var(--tracking-tight);
}

.todo-description {
  margin: 8px 0 0;
  color: var(--color-fg-tertiary);
  font-size: 14px;
  line-height: 1.6;
}

.todo-count {
  padding: 6px 9px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-fg-tertiary);
  font-family: var(--font-mono);
  font-size: 11px;
}

.todo-error {
  margin: 0;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
  border-radius: var(--radius-sm);
  background: var(--color-danger-muted);
  color: var(--color-danger);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.todo-panel,
.todo-input-bar {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-xs);
}

.todo-panel {
  min-height: 220px;
}

.todo-list {
  display: grid;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 16px;
  border-bottom: 1px solid var(--color-divider);
}

.todo-item:last-child {
  border-bottom: 0;
}

.todo-text {
  flex: 1;
  margin: 0;
  color: var(--color-fg);
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.todo-delete,
.todo-add {
  min-height: 38px;
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.todo-delete {
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-danger);
}

.todo-delete:hover:not(:disabled) {
  border-color: var(--color-danger);
  background: var(--color-danger-muted);
}

.todo-empty {
  display: flex;
  min-height: 218px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  color: var(--color-fg-tertiary);
  font-size: 13px;
}

.todo-empty strong {
  color: var(--color-fg-secondary);
  font-size: 15px;
}

.todo-input-bar {
  display: grid;
  gap: 9px;
  padding: 16px;
}

.todo-input-bar > label {
  color: var(--color-fg-secondary);
  font-size: 13px;
  font-weight: 600;
}

.todo-compose {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.todo-input {
  min-height: 62px;
  flex: 1;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  outline: none;
  background: var(--color-surface);
  color: var(--color-fg);
  font: inherit;
  font-size: 14px;
}

.todo-input:focus {
  border-color: var(--color-primary-deep);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.todo-add {
  min-width: 100px;
  border: 1px solid var(--color-primary-deep);
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.todo-delete:disabled,
.todo-add:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.todo-shortcut {
  color: var(--color-fg-tertiary);
  font-family: var(--font-mono);
  font-size: 10px;
}

@media (max-width: 640px) {
  .todo-page {
    padding: 20px 14px;
  }

  .todo-header {
    flex-direction: column;
  }

  .todo-compose {
    flex-direction: column;
  }

  .todo-add {
    width: 100%;
  }
}
</style>
