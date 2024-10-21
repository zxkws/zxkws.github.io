<script lang="ts" setup>
const menus = [
  {
    label: "TODO",
    value: "TODO",
    name: "todo",
  },
];
</script>
<template>
  <div class="menu mr-auto">
    <ul>
      <li v-for="menu in menus">
        <button @click="$router.push(menu.name)">{{ menu.label }}</button>
      </li>
    </ul>
  </div>
</template>
