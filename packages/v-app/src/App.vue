<script setup lang="ts">
import { useTheme } from '@/hooks/useTheme';
import Loading from '@/components/Loading.vue';

useTheme();
</script>

<template>
  <div class="wrapper w-full h-full">
    <router-view />
  </div>
  <Loading />
</template>

<style scoped>
.wrapper {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
