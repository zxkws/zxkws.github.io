export interface MenuItem {
  name: string;
  path?: string;
  children?: MenuItem[];
  icon?: string;
  order?: number;
  visible?: boolean;
  external?: boolean;
}

export {};
