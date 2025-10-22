<script setup lang="ts">
import Loading from '@/components/Loading.vue';
import Menu from '@/components/Menu.vue';
import Header from '@/components/Header.vue';
import { useResizeWidth } from '@/hooks';
import { mainStore } from '@/store';
import { onMounted, computed } from 'vue';

useResizeWidth();

const store = mainStore();
const isMicroApp = computed(() => store.isMicroApp);

onMounted(() => {
  store.setLoading(false);
});
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <Loading />
    <Header v-if="!isMicroApp" />
    <div class="flex flex-1 overflow-hidden">
      <Menu v-if="!isMicroApp" />
      <section
        class="flex-1 overflow-y-auto"
        :class="isMicroApp ? 'p-0 bg-transparent' : 'p-5 bg-gray-100 dark:bg-gray-900'"
      >
        <router-view />
      </section>
    </div>
  </div>
</template>
