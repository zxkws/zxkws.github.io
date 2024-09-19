import { defineStore } from "pinia";

export const mainStore = defineStore("main", {
  state: () => ({
    imgLoadStatus: false,
    backgroundShow: false,
    coverType: "0",
    setOpenState: false, // 设置页面开启状态
    innerWidth: null, // 当前窗口宽度
    boxOpenState: false, // 盒子开启状态
    mobileOpenState: false, // 移动端开启状态
    mobileFuncState: false, // 移动端功能区开启状态
  }),
  getters: {
    // 获取页面宽度
    getInnerWidth(state) {
      return state.innerWidth;
    },
  },
  actions: {
    setImgLoadStatus(value: boolean) {
      this.imgLoadStatus = value;
    },
    // 更改当前页面宽度
    setInnerWidth(value: number) {
      this.innerWidth = value as any;
      if (value >= 720) {
        this.mobileOpenState = false;
        this.mobileFuncState = false;
      }
    },
  },
  persist: {
    key: "data",
    storage: window.localStorage,
    paths: [],
  },
});
