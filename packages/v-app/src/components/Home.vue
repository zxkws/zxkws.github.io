<script setup lang="ts">
import Loading from "@/components/Loading.vue";
import Menu from "@/components/Menu.vue";
import isInIcestark from "@/utils/isInIcestark";
import { useResizeWidth } from "@/hooks";
import { mainStore } from "@/store";
useResizeWidth();

const store = mainStore();
const showMenu = !isInIcestark();

onMounted(() => {
  store.setLoading(false);
});
</script>

<template>
  <div class="w-full h-full flex">
    <Loading />
    <Menu v-if="showMenu" />
    <section class="h-full flex-1">
      <router-view></router-view>
    </section>
  </div>
</template>

<style lang="scss" scoped></style>
