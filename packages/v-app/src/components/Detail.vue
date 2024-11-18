<!-- src/components/DynamicHeightList.vue -->
<template>
  <div
    ref="containerRef"
    class="flex-1 overflow-y-auto box-border relative"
    @scroll="handleScroll"
  >
    <div :style="{ height: totalHeight + 'px' }"></div>
    <ul
      class="absolute top-0 left-0"
      :style="{
        transform: `translateY(${offsetY}px)`,
      }"
    >
      <li
        v-for="item in visibleItems"
        :key="item.id"
        class="text-gray-700 bg-gray-50 border-y-[1px]"
        :style="{ height: item.height + 'px' }"
      >
        {{ item.text }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";

const total = ref(100);
const containerRef = ref(null);
const items = ref([]);
const startIndex = ref(0);
const offsetY = ref(0);

function generateDynamicHeightData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i + 1}`,
    height: 50 + Math.floor(Math.random() * 100), // 动态高度在 50 到 150px 之间
  }));
}

const totalHeight = computed(() => {
  return items.value.reduce((sum, item) => sum + item.height, 0);
});

const visibleItems = computed(() => {
  return items.value.slice(startIndex.value, startIndex.value + 20);
});

function updateVisibleItems() {
  if (!containerRef.value) return;

  const scrollTop = containerRef.value.scrollTop;

  let currentHeight = 0;
  let start = 0;

  for (let i = 0; i < items.value.length; i++) {
    if (currentHeight >= scrollTop && start === 0) {
      start = i;
    }
    currentHeight += items.value[i].height;
  }

  startIndex.value = Math.max(0, start - 5); // 预加载5个项

  offsetY.value = items.value
    .slice(0, startIndex.value)
    .reduce((sum, item) => sum + item.height, 0);
}

function handleScroll() {
  updateVisibleItems();
}

onMounted(() => {
  items.value = generateDynamicHeightData(total.value);
  updateVisibleItems();
  window.addEventListener("resize", updateVisibleItems);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateVisibleItems);
});
</script>
