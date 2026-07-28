<script setup lang="ts">
import Header from '@/components/Header.vue';
import { useResizeWidth } from '@/hooks';
import { mainStore } from '@/store';
import Menu from '@/components/Menu.vue';
import { computed, onMounted } from 'vue';

useResizeWidth();

const store = mainStore();
const isMicroApp = computed(() => store.isMicroApp);

onMounted(() => {
  store.setLoading(false);
});
</script>

<template>
  <div class="tool-shell">
    <Header v-if="!isMicroApp" />
    <div class="tool-shell__body">
      <Menu v-if="!isMicroApp" />
      <section class="tool-shell__content" :class="{ 'tool-shell__content--micro': isMicroApp }">
        <router-view />
      </section>
    </div>
  </div>
</template>

<style scoped>
.tool-shell {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  background: var(--color-canvas);
  color: var(--color-fg);
}

.tool-shell__body {
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.tool-shell__content {
  min-width: 0;
  flex: 1;
  overflow-y: auto;
  background: var(--color-canvas);
}

.tool-shell__content--micro {
  background: transparent;
}
</style>
