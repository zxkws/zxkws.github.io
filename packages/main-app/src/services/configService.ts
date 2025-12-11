import configFile from '../config/micro-app-config.json';
import type { MicroAppConfig, SystemConfig } from '../types/config';

const isDevelopment = process.env.NODE_ENV === 'development';

type SystemConfigResponse = Omit<SystemConfig, 'updatedAt'> & {
  updatedAt: string | Date;
};

/**
 * 从内置 JSON 加载微应用配置
 */
export async function loadSystemConfig(): Promise<SystemConfig> {
  const normalized =
    (configFile as unknown as { data?: SystemConfigResponse }).data ??
    (configFile as unknown as SystemConfigResponse | undefined);

  if (!normalized) {
    throw new Error('微应用配置文件格式不正确');
  }

  return {
    microApps: (normalized.microApps ?? []) as MicroAppConfig[],
    version: normalized.version ?? '1.0.0',
    updatedAt: new Date(normalized.updatedAt ?? Date.now()),
  };
}

/**
 * 转换微应用配置为 ice-stark 格式
 */
export function convertToIceStarkApps(config: SystemConfig) {
  const resolveEntry = (app: MicroAppConfig) =>
    isDevelopment ? app.devEntry || app.entry : app.prodEntry || app.entry;

  return config.microApps
    .filter(
      (app) => app.enabled && app.name !== 'auth-app' && app.name !== 'person-resume-app' && app.name !== 'resume',
    ) // 登录与简历独立访问（独立站，不在主应用内嵌）
    .map((app) => {
      const renderType = app.renderType || ((app as unknown as { iframe?: boolean }).iframe ? 'iframe' : 'microfront');
      return {
        name: app.name,
        title: app.displayName,
        entry: resolveEntry(app),
        path: app.activeRule?.[0] ?? '/',
        activePath: app.activeRule,
        sandbox: app.sandbox ?? true,
        loadScriptMode: app.loadScriptMode || 'import',
        renderType,
        iframe: renderType === 'iframe',
      };
    });
}
