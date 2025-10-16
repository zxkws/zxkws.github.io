import { defineStore } from 'pinia';

export const mainStore = defineStore('main', {
  state: () => ({
    loading: true,
    isLoading: false,
    loadingMessage: '加载中',
    innerWidth: null,
    isMenuOpen: false, // for mobile
    isMenuCollapsed: false, // for desktop
    theme: 'system', // 'light', 'dark', 'system'
    isMicroApp: false,
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
      this.loadingMessage = loadingMessage || '加载中';
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
    setMicroAppMode(isMicroApp: boolean) {
      this.isMicroApp = isMicroApp;
    },
  },
  persist: {
    key: 'v-app-settings',
    storage: window.localStorage,
    paths: ['theme', 'isMenuCollapsed'],
  },
});
