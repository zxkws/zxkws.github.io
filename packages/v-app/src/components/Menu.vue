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
    label: 'TODO',
    value: 'TODO',
    name: 'todo',
  },
  {
    label: 'list',
    value: 'list',
    name: 'list',
  },
  {
    label: 'detail',
    value: 'detail',
    name: 'detail',
  },
  {
    label: 'navList',
    value: 'navList',
    name: 'navList',
  },
  {
    label: 'table',
    value: 'table',
    name: 'table',
  },
  {
    label: 'upload',
    value: 'upload',
    name: 'upload',
  },
  {
    label: '大模型信息榜',
    value: 'llmRanking',
    name: 'llm-ranking',
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
            <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                <div class="flex items-center relative">
                    <div class="avatar-z"><img class="w-[36px] h-[36px]"
                        src="https://p3-search.byteimg.com/obj/labis/240409394f2fa795c03c46212d79ec52" /></div>
                    <div class="ml-2 dark:text-white">zxkws</div>
                </div>
            </div>
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
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center relative">
                <div class="avatar-z"><img class="w-[36px] h-[36px]"
                    src="https://p3-search.byteimg.com/obj/labis/240409394f2fa795c03c46212d79ec52" /></div>
                <div :class="['ml-2 transition-opacity duration-300 dark:text-white', isMenuCollapsed ? 'opacity-0' : 'opacity-100']">zxkws</div>
            </div>
        </div>
        <ul class="space-y-2 mt-2 p-4">
            <li v-for="menu in menus" class="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            :key="menu.name">
            <button @click="$router.push({ name: menu.name })" :title="menu.label" class="w-full flex items-center dark:text-white" :class="{'justify-center': isMenuCollapsed}">
                <span :class="['transition-opacity', { 'opacity-0': isMenuCollapsed, 'opacity-100': !isMenuCollapsed }]" >{{ menu.label }}</span>
            </button>
            </li>
        </ul>
    </div>
  </div>
</template>
<style>
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
  border-radius: 10%;
  pointer-events: none;
  box-shadow: 0 0 20px #961cc4;
  animation: pulse 3s ease-in-out infinite;
}
</style>
