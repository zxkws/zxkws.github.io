<script setup lang="ts">
import { computed } from 'vue';
import { useTheme } from '@/hooks/useTheme';
import { mainStore } from '@/store';
import Loading from '@/components/Loading.vue';

useTheme();

const store = mainStore();
const isLoading = computed(() => store.isLoading);
</script>

<template>
  <div class="wrapper w-full h-full">
    <router-view />
  </div>
  <Loading :show="isLoading" />
</template>

<style scoped>
.wrapper {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
