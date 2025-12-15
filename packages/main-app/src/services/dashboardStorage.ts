export type RecentRoute = {
  path: string;
  label?: string;
  at: number;
};

export type PinnedRoute = {
  path: string;
  label?: string;
  pinnedAt: number;
};

export type MicroAppLoadMetric = {
  name: string;
  path?: string;
  durationMs: number;
  at: number;
};

const RECENT_KEY = 'main-app:recent-routes';
const PINNED_KEY = 'main-app:pinned-routes';
const MICRO_APP_KEY = 'main-app:microapp-load-metrics';

const RECENT_EVENT = 'main-app:recent-routes';
const PINNED_EVENT = 'main-app:pinned-routes';
const MICRO_APP_EVENT = 'main-app:microapp-load-metrics';

const MAX_RECENT = 12;
const MAX_MICRO_APP = 50;
const MAX_PINNED = 12;

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const read = <T>(key: string, fallback: T): T => {
  if (!isBrowser()) return fallback;
  try {
    return safeParse<T>(window.localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

const emit = <T>(eventName: string, detail: T) => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
  } catch {
    // ignore
  }
};

const normalizePath = (path: string) => {
  const trimmed = path.trim();
  if (!trimmed) return '/';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const getRecentRoutes = (): RecentRoute[] => {
  const raw = read<RecentRoute[]>(RECENT_KEY, []);
  return Array.isArray(raw) ? raw.filter((r) => r && typeof r.path === 'string') : [];
};

export const getPinnedRoutes = (): PinnedRoute[] => {
  const raw = read<PinnedRoute[]>(PINNED_KEY, []);
  return Array.isArray(raw) ? raw.filter((r) => r && typeof r.path === 'string') : [];
};

export const getMicroAppLoadMetrics = (): MicroAppLoadMetric[] => {
  const raw = read<MicroAppLoadMetric[]>(MICRO_APP_KEY, []);
  return Array.isArray(raw) ? raw.filter((m) => m && typeof m.name === 'string') : [];
};

export const recordRecentRoute = (route: { path: string; label?: string; at?: number }) => {
  const now = route.at ?? Date.now();
  const path = normalizePath(route.path);
  const label = typeof route.label === 'string' && route.label.trim() ? route.label.trim() : undefined;

  const current = getRecentRoutes();
  const next: RecentRoute[] = [
    {
      path,
      at: now,
      ...(label ? { label } : {}),
    },
    ...current.filter((r) => r.path !== path),
  ];
  const sliced = next.slice(0, MAX_RECENT);
  write(RECENT_KEY, sliced);
  emit(RECENT_EVENT, sliced);
  return sliced;
};

export const togglePinnedRoute = (route: { path: string; label?: string; pinnedAt?: number }) => {
  const now = route.pinnedAt ?? Date.now();
  const path = normalizePath(route.path);
  const label = typeof route.label === 'string' && route.label.trim() ? route.label.trim() : undefined;

  const current = getPinnedRoutes();
  const exists = current.some((r) => r.path === path);
  const next: PinnedRoute[] = exists
    ? current.filter((r) => r.path !== path)
    : [
        {
          path,
          pinnedAt: now,
          ...(label ? { label } : {}),
        },
        ...current,
      ].slice(0, MAX_PINNED);

  write(PINNED_KEY, next);
  emit(PINNED_EVENT, next);
  return next;
};

export const addMicroAppLoadMetric = (metric: { name: string; path?: string; durationMs: number; at?: number }) => {
  const now = metric.at ?? Date.now();
  const name = metric.name.trim();
  if (!name) return getMicroAppLoadMetrics();
  const path = metric.path ? normalizePath(metric.path) : undefined;
  const durationMs = Math.max(0, Math.round(metric.durationMs));

  const current = getMicroAppLoadMetrics();
  const next: MicroAppLoadMetric[] = [{ name, path, durationMs, at: now }, ...current].slice(0, MAX_MICRO_APP);
  write(MICRO_APP_KEY, next);
  emit(MICRO_APP_EVENT, next);
  return next;
};

export const subscribeRecentRoutes = (listener: (routes: RecentRoute[]) => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<RecentRoute[]>).detail ?? []);
  window.addEventListener(RECENT_EVENT, handler as EventListener);
  return () => window.removeEventListener(RECENT_EVENT, handler as EventListener);
};

export const subscribePinnedRoutes = (listener: (routes: PinnedRoute[]) => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<PinnedRoute[]>).detail ?? []);
  window.addEventListener(PINNED_EVENT, handler as EventListener);
  return () => window.removeEventListener(PINNED_EVENT, handler as EventListener);
};

export const subscribeMicroAppLoadMetrics = (listener: (metrics: MicroAppLoadMetric[]) => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<MicroAppLoadMetric[]>).detail ?? []);
  window.addEventListener(MICRO_APP_EVENT, handler as EventListener);
  return () => window.removeEventListener(MICRO_APP_EVENT, handler as EventListener);
};
