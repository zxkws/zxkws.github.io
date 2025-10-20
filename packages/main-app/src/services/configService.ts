import type { SystemConfig, MicroAppConfig } from '../types/config';

const isDevelopment = process.env.NODE_ENV === 'development';

const getConfigUrl = () => {
  if (isDevelopment) {
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      return `${protocol}//${hostname}:5175/micro-apps.json`;
    }
    return 'http://127.0.0.1:5175/micro-apps.json';
  }
  return `${window.location.origin}/config-center/micro-apps.json`;
};

/**
 * 从配置中心加载配置
 */
export async function loadSystemConfig(): Promise<SystemConfig> {
  const configUrl = getConfigUrl();
  const response = await fetch(configUrl);
  if (!response.ok) {
    throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
  }
  const config = await response.json();
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
    .filter((app) => app.enabled)
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
      };
    });
}
