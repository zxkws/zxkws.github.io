<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">大模型信息榜</h1>
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
import mockData from './mockdata.json';

interface LLM {
  id: number;
  name: string;
  description: string;
  url: string;
}

const llms = ref<LLM[]>(mockData);

</script>

<style scoped>
/* Add any specific styles for this page here */
</style>
