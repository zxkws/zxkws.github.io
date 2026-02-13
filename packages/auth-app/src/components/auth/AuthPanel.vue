<script setup lang="ts">
defineProps<{
  title: string;
  subtitle: string;
  error?: string;
}>();
</script>

<template>
  <div class="panel">
    <h1 class="title">{{ title }}</h1>
    <p class="subtitle">{{ subtitle }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <slot />
  </div>
</template>

