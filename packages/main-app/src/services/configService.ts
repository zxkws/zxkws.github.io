import type { MicroAppConfig, SystemConfig } from '../types/config';

const isDevelopment = process.env.NODE_ENV === 'development';
const CONFIG_FILE_PATH =
  (typeof window !== 'undefined' && (window as any).__MAIN_APP_CONFIG_FILE__) || '/micro-app-config.json';

type SystemConfigResponse = Omit<SystemConfig, 'updatedAt'> & {
  updatedAt: string | Date;
};

/**
 * 从 public 下的静态文件加载微应用配置
 */
export async function loadSystemConfig(): Promise<SystemConfig> {
  const res = await fetch(CONFIG_FILE_PATH, { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`无法读取微应用配置文件（${res.status}）`);
  }

  const raw = (await res.json()) as SystemConfigResponse | { data: SystemConfigResponse };
  const payload = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: SystemConfigResponse }).data : raw;

  if (!payload || typeof payload !== 'object') {
    throw new Error('微应用配置文件格式不正确');
  }

  const normalized = payload as SystemConfigResponse;

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
