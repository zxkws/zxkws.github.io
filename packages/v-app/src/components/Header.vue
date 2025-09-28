<template>
  <div class="header-container bg-white dark:bg-gray-800 dark:border-gray-700">
    <div class="flex items-center">
      <!-- Mobile menu button -->
      <button @click="store.toggleMenu()" class="md:hidden mr-3 text-gray-500 dark:text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
      <!-- Desktop collapse button -->
      <button @click="store.toggleMenuCollapse()" class="hidden md:block mr-3 text-gray-500 dark:text-gray-400">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
      <div class="logo text-gray-800 dark:text-white">My App</div>
    </div>
    <div class="flex items-center">
      <Menu as="div" class="relative inline-block text-left">
        <div>
          <MenuButton class="inline-flex justify-center w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none">
            <span class="sr-only">Open theme options</span>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1.01a7.002 7.002 0 016.29 6.29V17a1 1 0 11-2 0v-1a5 5 0 00-5-5H8a5 5 0 00-5 5v1a1 1 0 11-2 0v-6.69A7.002 7.002 0 019 3.01V3a1 1 0 011-1zM3 12a5 5 0 005 5h4a5 5 0 005-5v-1a1 1 0 112 0v1a7 7 0 11-14 0v-1a1 1 0 112 0v1z" clip-rule="evenodd" />
            </svg>
          </MenuButton>
        </div>

        <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
          <MenuItems class="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div class="py-1">
              <MenuItem v-slot="{ active }">
                <button @click="store.setTheme('light')" :class="[active ? 'bg-gray-100 dark:bg-gray-600' : '', 'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center']">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1.01a7.002 7.002 0 016.29 6.29V17a1 1 0 11-2 0v-1a5 5 0 00-5-5H8a5 5 0 00-5 5v1a1 1 0 11-2 0v-6.69A7.002 7.002 0 019 3.01V3a1 1 0 011-1z" /></svg>
                    Light
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button @click="store.setTheme('dark')" :class="[active ? 'bg-gray-100 dark:bg-gray-600' : '', 'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center']">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                    Dark
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button @click="store.setTheme('system')" :class="[active ? 'bg-gray-100 dark:bg-gray-600' : '', 'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center']">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.998.998 0 01.342.65l.234 1.235c.05.262.12.516.2.762a.998.998 0 00.442.65l2.25 1.5a1 1 0 00.788 0l7-3a1 1 0 000-1.84l-1.857-.795a.998.998 0 01-.342-.65l-.234-1.235a.998.998 0 00-.2-.762.998.998 0 00-.442-.65l-2.25-1.5z" /><path d="M10 12.585l-2.25-1.5.234-1.235.05-.262a.998.998 0 01.2-.762l.442-.65 2.25 1.5 2.25-1.5.442.65c.08.12.15.25.2.387l.234 1.235a.998.998 0 01-.342.65L10 12.585z" /></svg>
                    System
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>
      <div class="user-info ml-4 text-gray-800 dark:text-white">User</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { mainStore } from '@/store';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';

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
