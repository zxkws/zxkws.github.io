<script setup lang="ts">
import { RouterView } from 'vue-router';
import GlobalLoading from './components/GlobalLoading.vue';
</script>

<template>
  <RouterView />
  <GlobalLoading />
</template>
