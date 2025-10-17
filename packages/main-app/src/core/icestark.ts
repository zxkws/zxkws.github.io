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

const initializeMicroAppMenus = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!window.__MICRO_APP_MENUS__) {
    window.__MICRO_APP_MENUS__ = [];
  }
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
    loadScriptMode: 'script',
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
    console.log('[Icestark] Using cached config:', systemConfig);
    return systemConfig;
  }
  console.log('[Icestark] Loading config...');
  systemConfig = await loadSystemConfig();
  console.log('[Icestark] Config loaded and cached:', systemConfig);
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
