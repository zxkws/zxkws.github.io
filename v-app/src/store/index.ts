import { defineStore } from "pinia";

export const mainStore = defineStore("main", {
  state: () => ({
    imgLoadStatus: false,
    backgroundShow: false,
    coverType: "0",
  }),
  getters: {},
  actions: {
    setImgLoadStatus(value: boolean) {
      this.imgLoadStatus = value;
    },
  },
  persist: {
    key: "data",
    storage: window.localStorage,
    paths: [],
  },
});
