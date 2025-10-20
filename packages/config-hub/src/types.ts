export type LoadScriptMode = 'fetch' | 'script' | 'import';

export interface MenuItem {
  id: string;
  name: string;
  path?: string;
  icon?: string;
  type?: 'group' | 'item' | 'link' | 'external';
  visible?: boolean;
  order?: number;
  description?: string;
  children?: MenuItem[];
}

export interface MicroAppRecord {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  entry: string;
  devEntry?: string;
  prodEntry?: string;
  activeRule: string[];
  enabled: boolean;
  sandbox?: boolean;
  loadScriptMode?: LoadScriptMode;
  iframe?: boolean | string;
  tags?: string[];
  version?: string;
  menu?: MenuItem;
}

export interface SystemConfigDoc {
  microApps: MicroAppRecord[];
  standaloneMenus?: MenuItem[];
  version: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ConfigDocument {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  data: SystemConfigDoc;
}
