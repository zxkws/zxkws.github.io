import type { MicroAppConfig, SystemConfig } from '../types/config';
import { client } from './httpClient';

const isDevelopment = process.env.NODE_ENV === 'development';
const CONFIG_ENDPOINT = '/config-center/micro-apps';

type SystemConfigResponse = Omit<SystemConfig, 'updatedAt'> & {
  updatedAt: string | Date;
};

/**
 * 从配置中心加载配置
 */
export async function loadSystemConfig(): Promise<SystemConfig> {
  // 统一使用封装的 fetch，继承 BaseURL、credentials 与拦截器（loading/token 等）
  const raw = await client<SystemConfigResponse | { data: SystemConfigResponse }>(CONFIG_ENDPOINT, undefined, {
    method: 'GET',
  });

  const payload =
    raw && typeof raw === 'object' && raw !== null && 'data' in raw
      ? (raw as { data: SystemConfigResponse }).data
      : raw;

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid system config response');
  }

  const normalized = payload as SystemConfigResponse;

  return {
    ...normalized,
    updatedAt: new Date(normalized.updatedAt),
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
