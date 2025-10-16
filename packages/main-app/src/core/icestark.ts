import { registerMicroApps, start, type AppConfig } from '@ice/stark';

type RuntimeMicroApp = AppConfig & { url?: string | string[] };

const DEFAULT_MICRO_APPS: AppConfig[] = [
  {
    name: 'seller',
    title: 'React 微应用',
    activePath: ['/seller'],
    loadScriptMode: 'fetch',
    sandbox: true,
    url: [
      'https://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-seller-react/build/js/index.js',
      'https://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-seller-react/build/css/index.css',
    ],
  },
  {
    name: 'waiter',
    title: 'Vue 微应用',
    activePath: ['/waiter'],
    loadScriptMode: 'fetch',
    sandbox: true,
    url: [
      'https://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-waiter-vue/dist/js/app.js',
      'https://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-waiter-vue/dist/css/app.css',
    ],
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

const mergeMicroApps = (runtime: RuntimeMicroApp[] = []): AppConfig[] => {
  const merged = new Map<string, AppConfig>();
  DEFAULT_MICRO_APPS.forEach((app) => {
    if (!app.name) {
      return;
    }
    const normalizedUrl = normalizeUrl(app.url);
    if (normalizedUrl && normalizedUrl.length > 0) {
      merged.set(app.name, { ...app, url: normalizedUrl });
    }
  });

  runtime.forEach((app) => {
    if (!app.name) {
      return;
    }
    const normalizedUrl = normalizeUrl(app.url);
    if (!normalizedUrl || normalizedUrl.length === 0) {
      return;
    }
    const existing = merged.get(app.name);
    merged.set(app.name, {
      ...(existing ?? {}),
      ...app,
      url: normalizedUrl,
    });
  });

  return Array.from(merged.values());
};

const emitLoading = (loading: boolean) => {
  if (!loadingEventTarget) {
    return;
  }
  loadingEventTarget.dispatchEvent(new CustomEvent('micro-app-loading', { detail: loading }));
};

export const resolveMicroApps = (): AppConfig[] => {
  if (typeof window === 'undefined') {
    return mergeMicroApps();
  }

  const runtime = (window as typeof window & { __MAIN_APP_MICRO_APPS__?: RuntimeMicroApp[] }).__MAIN_APP_MICRO_APPS__ ?? [];
  return mergeMicroApps(runtime);
};

export const ensureIcestarkStarted = (options?: StartOptions) => {
  if (started) {
    return;
  }

  const apps = resolveMicroApps();
  if (apps.length > 0) {
    registerMicroApps(apps);
  }

  start({
    onLoadingApp: () => emitLoading(true),
    onFinishLoading: () => emitLoading(false),
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
