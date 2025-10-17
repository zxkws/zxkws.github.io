/**
 * 微应用配置化系统类型定义
 */

export interface MicroAppConfig {
  id: string;
  name: string;
  displayName: string;
  description?: string;

  entry: string;
  activeRule: string[];

  devEntry?: string;
  prodEntry?: string;

  sandbox?: boolean;
  loadScriptMode?: 'fetch' | 'script';

  enabled: boolean;
  version?: string;

  menu?: MenuConfig;

  permissions?: string[];
  roles?: string[];

  icon?: string;
  order?: number;
  tags?: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type MenuType = 'group' | 'item' | 'link' | 'external';
export type MenuSource = 'static' | 'dynamic' | 'micro-app';

export interface MenuConfig {
  id: string;

  microAppId?: string;

  name: string;
  path?: string;
  icon?: string;

  type: MenuType;

  parentId?: string;
  children?: MenuConfig[];

  visible: boolean;
  disabled?: boolean;

  permissions?: string[];
  roles?: string[];

  externalUrl?: string;
  openInNewTab?: boolean;

  badge?: string;
  description?: string;
  order?: number;

  source: MenuSource;
}

export interface StandaloneMenu extends Omit<MenuConfig, 'microAppId'> {
  microAppId?: never;
}

export interface SystemConfig {
  microApps: MicroAppConfig[];
  standaloneMenus?: StandaloneMenu[];
  version: string;
  updatedAt: Date;
}

export interface UserPermissions {
  permissions: string[];
  roles: string[];
}
