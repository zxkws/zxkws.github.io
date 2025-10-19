import { onMounted, onBeforeUnmount } from 'vue';
import { mainStore } from '../store';

export const useResizeWidth = () => {
  const store = mainStore();
  const updateWidth = () => store.setInnerWidth(window.innerWidth);

  onMounted(() => {
    updateWidth();
    window.addEventListener('resize', updateWidth);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateWidth);
  });
};
