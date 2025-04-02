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
    label: "navList",
    value: "navList",
    name: "navList",
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
    <div class="flex items-center relative">
      <div class="avatar-z"><img class="w-[36px] h-[36px]"
        src="https://p3-search.byteimg.com/obj/labis/240409394f2fa795c03c46212d79ec52" /></div>
      <div class="ml-2">zxkws</div>
    </div>
    <ul class="space-y-2 mt-2">
      <li v-for="menu in menus" class="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
        :key="menu.name">
        <button @click="$router.push(menu.name)">{{ menu.label }}</button>
      </li>
    </ul>
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
