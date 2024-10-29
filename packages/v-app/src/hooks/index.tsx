import { mainStore } from "../store";
export const useResizeWidth = () => {
  const store = mainStore();
  // 页面宽度
  const getWidth = () => {
    store.setInnerWidth(window.innerWidth);
  };

  onBeforeUnmount(() => {
    window.removeEventListener("resize", getWidth);
  });
};
