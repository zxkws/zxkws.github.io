<template>
  <div class="header-container">
    <div class="logo">My App</div>
    <div class="user-info">User</div>
  </div>
</template>

<script lang="ts" setup>
// Header logic can go here
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
