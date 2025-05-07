<script setup lang="ts">
import Loading from "@/components/Loading.vue";
import Menu from "@/components/Menu.vue";
import { useResizeWidth } from "@/hooks";
import { mainStore } from "@/store";
useResizeWidth();

const store = mainStore();

onMounted(() => {
  store.setLoading(false);
});
</script>

<template>
  <div class="w-full h-full flex">
    <Loading />
    <!-- <Menu /> -->
    <section class="w-full h-full flex-1">
      <router-view></router-view>
    </section>
  </div>
</template>

<style lang="scss" scoped></style>
