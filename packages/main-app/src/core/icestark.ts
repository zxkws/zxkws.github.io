import { type AppConfig, registerMicroApps, start } from '@ice/stark';
import type { AppRouteProps } from '@ice/stark/lib/AppRoute';
import { convertToIceStarkApps, loadSystemConfig } from '../services/configService';
import type { SystemConfig } from '../types/config';

type MicroAppConfig = AppRouteProps;
type RuntimeMicroApp = MicroAppConfig & { url?: string | string[] };

let systemConfig: SystemConfig | null = null;

const registeredAppNames = new Set<string>();
let started = false;

const hydrateRegisteredNames = () => {
  if (typeof window === 'undefined') {
    return;
  }
  const existing = (window as typeof window & { microApps?: Array<{ name?: string }> }).microApps;
  if (!existing || existing.length === 0) {
    return;
  }
  existing.forEach((app) => {
    if (app?.name) {
      registeredAppNames.add(app.name);
    }
  });
};

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

const dispatchMicroAppMounted = () => {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('micro-app-mounted'));
};

export const loadConfig = async (): Promise<SystemConfig> => {
  if (systemConfig) {
    return systemConfig;
  }
  systemConfig = await loadSystemConfig();
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

const ensureAppsRegistered = (apps: MicroAppConfig[]) => {
  hydrateRegisteredNames();
  const registerable = apps.filter((app) => {
    if (!('component' in app) && !('render' in app) && !('iframe' in app && app.iframe)) {
      if (app.name && !registeredAppNames.has(app.name)) {
        return true;
      }
    }
    return false;
  });

  if (registerable.length === 0) {
    return;
  }
  registerMicroApps(registerable as AppConfig[]);
  registerable.forEach((app) => {
    if (app.name) {
      registeredAppNames.add(app.name);
    }
  });
};

export const ensureIcestarkStarted = () => {
  ensureAppsRegistered(resolveMicroApps());
  if (started) {
    return;
  }
  start({
    onLoadingApp: () => emitLoading(true),
    onFinishLoading: () => {
      emitLoading(false);
      dispatchMicroAppMounted();
    },
    onError: (error) => {
      console.error('[MainApp] micro app load error', error);
      emitLoading(false);
    },
  });
  started = true;
};

export const ensureIcestarkAppsRegistered = (apps: MicroAppConfig[]) => {
  ensureAppsRegistered(apps);
};

export const notifyMicroAppLoading = (loading: boolean) => emitLoading(loading);

export const notifyMicroAppMounted = () => {
  emitLoading(false);
  dispatchMicroAppMounted();
};

export const subscribeMicroAppLoading = (listener: (_loading: boolean) => void): (() => void) => {
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
