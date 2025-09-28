<template>
  <div class="header-container bg-white dark:bg-gray-800 dark:border-gray-700">
    <!-- Left Side -->
    <div class="flex items-center">
      <!-- Mobile menu button -->
      <button @click="store.toggleMenu()" class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden mr-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
      <!-- Desktop collapse button -->
      <button @click="store.toggleMenuCollapse()" class="hidden md:block p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 mr-2">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      </button>
      <div class="logo text-gray-800 dark:text-white">My App</div>
    </div>

    <!-- Right Side -->
    <div class="flex items-center space-x-5">
      <!-- Theme Switcher -->
      <Menu as="div" class="relative inline-block text-left">
        <div>
          <MenuButton class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800 focus:ring-indigo-500">
            <span class="sr-only">Open theme options</span>
            <!-- Sun icon for light mode, Moon for dark mode -->
            <svg v-if="store.theme === 'light'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else-if="store.theme === 'dark'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </MenuButton>
        </div>

        <transition enter-active-class="transition ease-out duration-100" enter-from-class="transform opacity-0 scale-95" enter-to-class="transform opacity-100 scale-100" leave-active-class="transition ease-in duration-75" leave-from-class="transform opacity-100 scale-100" leave-to-class="transform opacity-0 scale-95">
          <MenuItems class="origin-top-right absolute right-0 mt-2 w-36 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div class="py-1">
              <MenuItem v-slot="{ active }">
                <button @click="store.setTheme('light')" :class="[active ? 'bg-gray-100 dark:bg-gray-700' : '', 'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center']">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a1 1 0 011 1v1.01a7.002 7.002 0 016.29 6.29V17a1 1 0 11-2 0v-1a5 5 0 00-5-5H8a5 5 0 00-5 5v1a1 1 0 11-2 0v-6.69A7.002 7.002 0 019 3.01V3a1 1 0 011-1z" /></svg>
                    Light
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button @click="store.setTheme('dark')" :class="[active ? 'bg-gray-100 dark:bg-gray-700' : '', 'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center']">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                    Dark
                </button>
              </MenuItem>
              <MenuItem v-slot="{ active }">
                <button @click="store.setTheme('system')" :class="[active ? 'bg-gray-100 dark:bg-gray-700' : '', 'w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 flex items-center']">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.998.998 0 01.342.65l.234 1.235c.05.262.12.516.2.762a.998.998 0 00.442.65l2.25 1.5a1 1 0 00.788 0l7-3a1 1 0 000-1.84l-1.857-.795a.998.998 0 01-.342-.65l-.234-1.235a.998.998 0 00-.2-.762.998.998 0 00-.442-.65l-2.25-1.5z" /><path d="M10 12.585l-2.25-1.5.234-1.235.05-.262a.998.998 0 01.2-.762l.442-.65 2.25 1.5 2.25-1.5.442.65c.08.12.15.25.2.387l.234 1.235a.998.998 0 01-.342.65L10 12.585z" /></svg>
                    System
                </button>
              </MenuItem>
            </div>
          </MenuItems>
        </transition>
      </Menu>

      <!-- User Info -->
      <div class="user-info text-gray-800 dark:text-white">
        <div class="flex items-center relative cursor-pointer">
            <div class="avatar-z"><img class="w-[36px] h-[36px] rounded-full"
                src="https://p3-search.byteimg.com/obj/labis/240409394f2fa795c03c46212d79ec52" /></div>
            <div class="ml-2 dark:text-white hidden sm:block">zxkws</div>
        </div>
      </div>
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

@keyframes pulse {
  0% {
    opacity: .5;
    transform: scale(0.95)
  }

  50% {
    opacity: 1;
    transform: scale(1)
  }

  100% {
    opacity: .5;
    transform: scale(0.95)
  }
}

.avatar-z::after {
  width: 36px;
  height: 36px;
  position: absolute;
  top: 1px;
  content: " ";
  display: block;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 20px #961cc4;
  animation: pulse 3s ease-in-out infinite;
}
</style>
