<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import appHistory from '@ice/stark-app/lib/appHistory';

const jumpToLayout = () => {
  appHistory.push('/');
};

</script>

<template>
  <div class="wrapper">
    <router-view />
  </div>

</template>

<style scoped>
.wrapper {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
