<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">大模型信息榜</h1>
    <div v-if="loading">
      <p class="dark:text-gray-300">Loading...</p>
    </div>
    <div v-else>
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
import { ref, onMounted } from 'vue';

interface LLM {
  id: number;
  name: string;
  description: string;
  url: string;
}

const llms = ref<LLM[]>([]);
const loading = ref(true);

const mockData: LLM[] = [
  { id: 1, name: 'Gemini', description: 'A powerful and versatile large language model from Google.', url: 'https://gemini.google.com/' },
  { id: 2, name: 'GPT-4', description: 'The latest generation of OpenAIs language model.', url: 'https://openai.com/gpt-4' },
  { id: 3, name: 'Claude 3', description: 'A family of large language models developed by Anthropic.', url: 'https://www.anthropic.com/claude' },
];

onMounted(() => {
  setTimeout(() => {
    llms.value = mockData;
    loading.value = false;
  }, 1000); // Simulate network delay
});
</script>

<style scoped>
/* Add any specific styles for this page here */
</style>
