<template>
  <div class="header-container">
    <div class="flex items-center">
      <!-- Mobile menu button -->
      <button @click="store.toggleMenu()" class="md:hidden mr-3">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
      <!-- Desktop collapse button -->
      <button @click="store.toggleMenuCollapse()" class="hidden md:block mr-3">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
      <div class="logo">My App</div>
    </div>
    <div class="user-info">User</div>
  </div>
</template>

<script lang="ts" setup>
import { mainStore } from '@/store';

const store = mainStore();
</script>

<style scoped>
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid #eee;
}

.logo {
  font-size: 20px;
  font-weight: bold;
}
</style>
