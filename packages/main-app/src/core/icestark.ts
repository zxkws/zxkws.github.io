import React from 'react';
import { registerMicroApps, start, type AppConfig } from '@ice/stark';
import type { AppRouteProps } from '@ice/stark/lib/AppRoute';
import CurlConverterMicroApp from '../microApps/CurlConverterMicroApp';
import { loadSystemConfig, convertToIceStarkApps } from '../services/configService';
import type { SystemConfig } from '../types/config';

type MicroAppConfig = AppRouteProps;
type RuntimeMicroApp = MicroAppConfig & { url?: string | string[] };

const isDevelopment = process.env.NODE_ENV === 'development';

let systemConfig: SystemConfig | null = null;

const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.origin;
};

const getMicroAppUrl = (name: string, devPort?: number): string => {
  if (isDevelopment && devPort) {
    return `http://localhost:${devPort}`;
  }
  return `${getBaseUrl()}/${name}/`;
};

interface MicroAppMenuMeta {
  appName: string;
  title: string;
  icon?: string;
  defaultMenus: Array<{
    name: string;
    path: string;
    icon?: string;
  }>;
}

const MICRO_APP_MENU_META: MicroAppMenuMeta[] = [
  {
    appName: 'v-app',
    title: 'Vue 应用',
    icon: 'atm',
    defaultMenus: [
      { name: '导航列表', path: '/v-app/navList', icon: '🏠' },
      { name: 'Todo', path: '/v-app/todo', icon: '✅' },
      { name: '账户管理', path: '/v-app/account', icon: '👤' },
      { name: 'LLM 排名', path: '/v-app/llm-ranking', icon: '📊' },
    ],
  },
  {
    appName: 'textdiff',
    title: '文本对比',
    icon: 'set',
    defaultMenus: [{ name: '文本对比工具', path: '/textdiff/', icon: '📝' }],
  },
];

const initializeMicroAppMenus = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.__MICRO_APP_MENUS__) {
    window.__MICRO_APP_MENUS__ = [];
  }

  MICRO_APP_MENU_META.forEach((meta) => {
    if (!window.__MICRO_APP_MENUS__) {
      return;
    }

    const existingIndex = window.__MICRO_APP_MENUS__.findIndex((config) => config.appName === meta.appName);

    if (existingIndex === -1) {
      window.__MICRO_APP_MENUS__.push({
        appName: meta.appName,
        menus: meta.defaultMenus,
      });
    }
  });
};

const DEFAULT_MICRO_APPS: MicroAppConfig[] = [
  {
    name: 'curlconverter',
    title: 'Curl Converter',
    activePath: ['/curlconverter'],
    component: React.createElement(CurlConverterMicroApp),
  },
  {
    name: 'v-app',
    title: 'Vue Application',
    activePath: ['/v-app'],
    loadScriptMode: 'fetch',
    sandbox: true,
    entry: getMicroAppUrl('v-app', 5173),
  },
  {
    name: 'textdiff',
    title: 'Text Difference',
    activePath: ['/textdiff'],
    loadScriptMode: 'fetch',
    sandbox: true,
    entry: getMicroAppUrl('textdiff', 5174),
  },
];

type StartOptions = Parameters<typeof start>[0];

let started = false;

const loadingEventTarget = typeof window !== 'undefined' ? new EventTarget() : undefined;

const normalizeUrl = (url?: string | string[]): string[] | undefined => {
  if (!url) {
    return undefined;
  }

  if (Array.isArray(url)) {
    return url.filter(Boolean);
  }

  return url ? [url] : undefined;
};

const mergeMicroApps = (runtime: RuntimeMicroApp[] = []): MicroAppConfig[] => {
  const merged = new Map<string, MicroAppConfig>();
  DEFAULT_MICRO_APPS.forEach((app) => {
    if (!app.name) {
      return;
    }
    const normalizedUrl = normalizeUrl(app.url);
    const next: MicroAppConfig = { ...app };
    if (normalizedUrl && normalizedUrl.length > 0) {
      next.url = normalizedUrl;
    } else {
      delete (next as { url?: string | string[] }).url;
    }
    merged.set(app.name, next);
  });

  runtime.forEach((app) => {
    if (!app.name) {
      return;
    }
    const normalizedUrl = normalizeUrl(app.url);
    const existing = merged.get(app.name);
    const next: MicroAppConfig = {
      ...(existing ?? {}),
      ...app,
    };
    if (normalizedUrl && normalizedUrl.length > 0) {
      next.url = normalizedUrl;
    } else {
      delete (next as { url?: string | string[] }).url;
    }
    merged.set(app.name, next);
  });

  return Array.from(merged.values());
};

const emitLoading = (loading: boolean) => {
  if (!loadingEventTarget) {
    return;
  }
  loadingEventTarget.dispatchEvent(new CustomEvent('micro-app-loading', { detail: loading }));
};

export const loadConfig = async (): Promise<SystemConfig> => {
  if (systemConfig) {
    return systemConfig;
  }
  systemConfig = await loadSystemConfig();
  return systemConfig;
};

export const getSystemConfig = (): SystemConfig | null => {
  return systemConfig;
};

export const resolveMicroApps = (): MicroAppConfig[] => {
  if (typeof window === 'undefined') {
    return mergeMicroApps();
  }

  if (systemConfig) {
    const configApps = convertToIceStarkApps(systemConfig);
    return mergeMicroApps(configApps as RuntimeMicroApp[]);
  }

  const runtime =
    (window as typeof window & { __MAIN_APP_MICRO_APPS__?: RuntimeMicroApp[] }).__MAIN_APP_MICRO_APPS__ ?? [];
  return mergeMicroApps(runtime);
};

export const ensureIcestarkStarted = (options?: StartOptions) => {
  if (started) {
    return;
  }

  initializeMicroAppMenus();

  const apps = resolveMicroApps();
  const registerable = apps.filter((app) => !('component' in app) && !('render' in app));
  if (registerable.length > 0) {
    registerMicroApps(registerable as AppConfig[]);
  }

  start({
    onLoadingApp: () => emitLoading(true),
    onFinishLoading: () => {
      emitLoading(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('micro-app-mounted'));
      }
    },
    ...(options ?? {}),
  });

  started = true;
};

export const subscribeMicroAppLoading = (listener: (loading: boolean) => void): (() => void) => {
  if (!loadingEventTarget) {
    return () => undefined;
  }
  const handler = (event: Event) => {
    const { detail } = event as CustomEvent<boolean>;
    listener(detail);
  };
  loadingEventTarget.addEventListener('micro-app-loading', handler);
  return () => loadingEventTarget.removeEventListener('micro-app-loading', handler);
};

export { DEFAULT_MICRO_APPS };
