import { defineStore } from 'pinia';
import type { PersistenceOptions } from 'pinia-plugin-persistedstate';

type ThemeMode = 'light' | 'dark' | 'system';

interface MainState {
  loading: boolean;
  isLoading: boolean;
  loadingMessage: string;
  innerWidth: number | null;
  isMenuOpen: boolean;
  isMenuCollapsed: boolean;
  theme: ThemeMode;
  isMicroApp: boolean;
}

type MainGetters = Record<string, (_state: MainState) => unknown> & {
  getInnerWidth: (_state: MainState) => number | null;
};

type MainActions = {
  setLoading: (_value: boolean, _loadingMessage?: string) => void;
  setInnerWidth: (_value: number) => void;
  toggleMenu: () => void;
  toggleMenuCollapse: () => void;
  setTheme: (_theme: ThemeMode) => void;
  setMicroAppMode: (_isMicroApp: boolean) => void;
};

const persistConfig: PersistenceOptions<MainState> | false =
  typeof window === 'undefined'
    ? false
    : {
        key: 'v-app-settings',
        storage: window.localStorage,
        pick: ['theme', 'isMenuCollapsed'],
      };

export const mainStore = defineStore<'main', MainState, MainGetters, MainActions>('main', {
  state: () => ({
    loading: true,
    isLoading: false,
    loadingMessage: '加载中',
    innerWidth: null,
    isMenuOpen: false,
    isMenuCollapsed: false,
    theme: 'system' as ThemeMode,
    isMicroApp: false,
  }),
  getters: {
    getInnerWidth(state) {
      return state.innerWidth;
    },
  },
  actions: {
    setLoading(value, loadingMessage) {
      this.loading = value;
      this.loadingMessage = loadingMessage ?? '加载中';
    },
    setInnerWidth(value) {
      this.innerWidth = value;
    },
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    },
    toggleMenuCollapse() {
      this.isMenuCollapsed = !this.isMenuCollapsed;
    },
    setTheme(theme) {
      this.theme = theme;
    },
    setMicroAppMode(isMicroApp) {
      this.isMicroApp = isMicroApp;
    },
  },
  persist: persistConfig,
});
