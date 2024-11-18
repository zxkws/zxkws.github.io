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
        transform: `translateY(${offsetY}px)`, // 设置偏移量
      }"
    >
      <li
        v-for="item in visibleItems"
        :key="item.id"
        class="border-y-[1px] text-gray-700 h-[50px]"
      >
        {{ item.text }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";

const items = ref([]);
const total = ref(200); // 总条目数，调大测试是否能正常渲染到底部
const itemHeight = 50; // 每个条目的高度
const containerRef = ref();
const containerHeight = computed(() => containerRef.value?.clientHeight || 0); // 容器固定高度
const visibleCount = computed(() =>
  Math.ceil(containerHeight.value / itemHeight)
); // 可见条目数量

// 总内容高度，确保滚动的区域正确覆盖所有内容
const totalHeight = computed(() => total.value * itemHeight);

// 记录起始索引和偏移量
const startIndex = ref(0);
const offsetY = ref(0); // 实际偏移量，用于控制 translateY

// 增加缓冲区，确保上下滚动有足够的渲染项
const bufferSize = 10;

const visibleItems = computed(() => {
  if (!visibleCount.value) return [];
  const start = Math.max(0, startIndex.value - bufferSize);
  const end = Math.min(
    startIndex.value + visibleCount.value + bufferSize,
    total.value
  );
  return items.value.slice(start, end);
});

function handleScroll(event) {
  // 获取真实的 scrollTop 值
  const scrollTop = event.target.scrollTop;

  // 根据 scrollTop 计算起始索引
  startIndex.value = Math.floor(scrollTop / itemHeight);

  // 计算偏移量 offsetY，用于 translateY
  offsetY.value = startIndex.value * itemHeight;
}

function generateFixedHeightData(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    text: `Item ${i + 1}`,
  }));
}

onMounted(() => {
  items.value = generateFixedHeightData(total.value);
});
</script>

<style scoped></style>
