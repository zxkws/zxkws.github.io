import { computed, ref } from 'vue';

const counter = ref(0);

export const startLoading = () => {
  counter.value += 1;
};

export const stopLoading = () => {
  counter.value = Math.max(0, counter.value - 1);
};

export const isGlobalLoading = computed(() => counter.value > 0);
