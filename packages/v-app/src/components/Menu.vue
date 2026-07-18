<script lang="ts" setup>
import {
  Dialog,
  DialogPanel,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue';
import { mainStore } from '@/store';
import { computed } from 'vue';

const store = mainStore();
const isMenuOpen = computed(() => store.isMenuOpen);
const isMenuCollapsed = computed(() => store.isMenuCollapsed);

const menus = [
  {
    label: '文本对比',
    value: 'textDifference',
    name: 'textDifference',
  },
  {
    label: 'JSON 工具',
    value: 'jsonViewer',
    name: 'jsonViewer',
  },
  {
    label: 'TODO',
    value: 'TODO',
    name: 'todo',
  },
  {
    label: 'navList',
    value: 'navList',
    name: 'navList',
  },
  {
    label: '大模型信息榜',
    value: 'llmRanking',
    name: 'llmRanking',
  },
];

function closeMenu() {
  store.isMenuOpen = false;
}
</script>
<template>
  <!-- Mobile menu -->
  <TransitionRoot as="template" :show="isMenuOpen">
    <Dialog as="div" class="relative z-40 md:hidden" @close="closeMenu">
      <TransitionChild
        as="template"
        enter="transition-opacity ease-linear duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-gray-600 bg-opacity-75" />
      </TransitionChild>

      <div class="fixed inset-0 z-40 flex">
        <TransitionChild
          as="template"
          enter="transition ease-in-out duration-300 transform"
          enter-from="-translate-x-full"
          enter-to="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leave-from="translate-x-0"
          leave-to="-translate-x-full"
        >
          <DialogPanel class="relative flex w-full max-w-xs flex-1 flex-col bg-white dark:bg-gray-800">
            <ul class="space-y-2 mt-2 p-4">
              <li v-for="menu in menus" class="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                :key="menu.name">
                <button @click="$router.push({ name: menu.name }); closeMenu()" class="w-full text-left dark:text-white">{{ menu.label }}</button>
              </li>
            </ul>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Desktop sidebar -->
  <div :class="['hidden md:flex md:flex-shrink-0 transition-all duration-300', isMenuCollapsed ? 'w-20' : 'w-64']">
    <div class="flex w-full flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <ul class="space-y-2 mt-2 p-4">
            <li v-for="menu in menus" class="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            :key="menu.name">
            <button @click="$router.push({ name: menu.name })" :title="menu.label" class="w-full flex items-center h-8 dark:text-white" :class="{'justify-center': isMenuCollapsed}">
              <transition name="fade" mode="out-in">
                <span v-if="!isMenuCollapsed" class="whitespace-nowrap">{{ menu.label }}</span>
                <span v-else>{{ menu.label.charAt(0) }}</span>
              </transition>
            </button>
            </li>
        </ul>
    </div>
  </div>
</template>
<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
