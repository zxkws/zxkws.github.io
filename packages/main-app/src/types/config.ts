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
  /**
   * Optional basename passed to micro app.
   * If provided, icestark will deliver this basename to child apps
   * instead of deriving from activeRule.
   */
  basename?: string;

  devEntry?: string;
  prodEntry?: string;

  sandbox?: boolean;
  loadScriptMode?: 'fetch' | 'script' | 'import';

  enabled: boolean;
  renderType?: 'microfront' | 'iframe';
  version?: string;

  order?: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface SystemConfig {
  microApps: MicroAppConfig[];
  version: string;
  updatedAt: Date;
}
