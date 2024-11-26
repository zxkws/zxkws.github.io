<script lang="ts" setup>
const menus = [
  {
    label: "TODO",
    value: "TODO",
    name: "todo",
  },
  {
    label: "list",
    value: "list",
    name: "list",
  },
  {
    label: "detail",
    value: "detail",
    name: "detail",
  },
  {
    label: "siteProxy",
    value: "siteProxy",
    name: "siteProxy",
  },
  {
    label: "table",
    value: "table",
    name: "table",
  },
  {
    label: "upload",
    value: "upload",
    name: "upload",
  },
];
</script>
<template>
  <div class="w-1/6 p-4 border-r border-gray-200 shadow-lg">
    <ul class="space-y-2">
      <li
        v-for="menu in menus"
        class="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
        :key="menu.name"
      >
        <button @click="$router.push(menu.name)">{{ menu.label }}</button>
      </li>
    </ul>
  </div>
</template>
