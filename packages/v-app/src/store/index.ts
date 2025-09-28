import { defineStore } from "pinia";

export const mainStore = defineStore("main", {
  state: () => ({
    loading: true,
    loadingMessage: "加载中",
    innerWidth: null,
    isMenuOpen: false, // for mobile
    isMenuCollapsed: false, // for desktop
    theme: 'system', // 'light', 'dark', 'system'
  }),
  getters: {
    // 获取页面宽度
    getInnerWidth(state) {
      return state.innerWidth;
    },
  },
  actions: {
    setLoading(value: boolean, loadingMessage?: string) {
      this.loading = value;
      this.loadingMessage = loadingMessage || "加载中";
    },
    // 更改当前页面宽度
    setInnerWidth(value: number) {
      this.innerWidth = value as any;
    },
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    },
    toggleMenuCollapse() {
      this.isMenuCollapsed = !this.isMenuCollapsed;
    },
    setTheme(theme: string) {
      this.theme = theme;
    },
  },
  persist: {
    key: "v-app-settings",
    storage: window.localStorage,
    paths: ['theme', 'isMenuCollapsed'],
  },
});
