<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">大模型信息榜</h1>
    
    <div class="mb-4">
      <label for="mock-select" class="mr-2 text-gray-900 dark:text-white">选择数据源:</label>
      <select id="mock-select" v-model="selectedSource" class="p-2 border rounded bg-white dark:bg-gray-700 dark:text-white">
        <option v-for="source in sourceKeys" :key="source" :value="source">
          {{ source }}
        </option>
      </select>
    </div>

    <div>
      <ul>
        <li v-for="llm in llms" :key="llm.id" class="mb-4 p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-semibold">
            <a :href="llm.url" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline dark:text-blue-400">
              {{ llm.name }}
            </a>
          </h2>
          <p class="text-gray-700 dark:text-gray-300 mt-2">{{ llm.description }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';

interface LLM {
  id: number;
  name: string;
  description: string;
  url: string;
}

const modules = import.meta.glob('./mock/*.json', { eager: true, import: 'default' });

const mockDataSources: Record<string, LLM[]> = {};
for (const path in modules) {
  const fileName = path.split('/').pop()?.replace('.json', '');
  if (fileName) {
    mockDataSources[fileName] = modules[path] as LLM[];
  }
}

const sourceKeys = Object.keys(mockDataSources);
sourceKeys.sort((a, b) => b.localeCompare(a)); // Sort descending to show latest first

const selectedSource = ref(sourceKeys.length > 0 ? sourceKeys[0] : '');

const llms = computed(() => {
  return selectedSource.value ? mockDataSources[selectedSource.value] : [];
});

</script>

<style scoped>
/* Add any specific styles for this page here */
</style>
