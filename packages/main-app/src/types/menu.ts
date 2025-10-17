export interface MenuItem {
  name: string;
  path?: string;
  icon?: string;
  children?: MenuItem[];
  external?: boolean;
}

export interface MicroAppMenuConfig {
  appName: string;
  menus: MenuItem[];
}

declare global {
  interface Window {
    __MICRO_APP_MENUS__?: MicroAppMenuConfig[];
  }
}

export {};
