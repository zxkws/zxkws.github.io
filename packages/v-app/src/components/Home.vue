<script setup lang="ts">
import Loading from "@/components/Loading.vue";
import Menu from "@/components/Menu.vue";
import Header from "@/components/Header.vue";
import { useResizeWidth } from "@/hooks";
import { mainStore } from "@/store";
import { onMounted } from 'vue';

useResizeWidth();

const store = mainStore();

onMounted(() => {
  store.setLoading(false);
});
</script>

<template>
  <div class="w-full h-full flex flex-col">
    <Loading />
    <Header />
    <div class="flex flex-1 overflow-hidden">
      <Menu />
      <section class="flex-1 overflow-y-auto p-5">
        <router-view></router-view>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
