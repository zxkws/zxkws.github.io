import type { SystemConfig, MicroAppConfig } from '../types/config';
import { client } from './httpClient';

const isDevelopment = process.env.NODE_ENV === 'development';
const CONFIG_ENDPOINT = '/config-center/micro-apps';

/**
 * 从配置中心加载配置
 */
export async function loadSystemConfig(): Promise<SystemConfig> {
  // 统一使用封装的 fetch，继承 BaseURL、credentials 与拦截器（loading/token 等）
  const raw = await client<any>(CONFIG_ENDPOINT, undefined, { method: 'GET' });
  const config = raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : raw;
  return {
    ...config,
    updatedAt: new Date(config.updatedAt),
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
