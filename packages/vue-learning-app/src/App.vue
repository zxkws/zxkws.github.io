<template>
  <main class="container">
    <header>
      <h1>Vue 学习微应用</h1>
      <p>用于在线调试与实验的示例项目。</p>
    </header>
    <section>
      <dl>
        <div>
          <dt>运行模式</dt>
          <dd>{{ mode }}</dd>
        </div>
        <div>
          <dt>Micro 前端基准路径</dt>
          <dd>{{ base }}</dd>
        </div>
        <div>
          <dt>Source Map</dt>
          <dd>已始终开启（用于生产环境排查问题）。</dd>
        </div>
      </dl>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ base?: string }>();
const mode = import.meta.env.MODE;
const base = computed(() => props.base ?? import.meta.env.BASE_URL ?? '/');
</script>

<style scoped>
.container {
  max-width: 640px;
  width: 100%;
  background: white;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.5rem;
}

header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
}

header p {
  margin: 0.5rem 0 0;
  color: #475569;
}

section dl {
  display: grid;
  gap: 1rem;
}

section dt {
  font-weight: 600;
  color: #1f2937;
}

section dd {
  margin: 0.25rem 0 0;
  color: #334155;
}
</style>
