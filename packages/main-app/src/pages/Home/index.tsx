import { type ReactNode, useEffect, useMemo, useState } from 'react';
import SafeAppLink from '../../components/SafeAppLink';
import { useUser } from '../../context/UserContext';
import {
  getMicroAppLoadMetrics,
  getPinnedRoutes,
  getRecentRoutes,
  type MicroAppLoadMetric,
  type PinnedRoute,
  type RecentRoute,
  subscribeMicroAppLoadMetrics,
  subscribePinnedRoutes,
  subscribeRecentRoutes,
  togglePinnedRoute,
} from '../../services/dashboardStorage';

type PerfSnapshot = {
  ttfbMs?: number;
  dclMs?: number;
  loadMs?: number;
  lcpMs?: number;
  cls?: number;
};

type SwSnapshot = {
  supported: boolean;
  controlling: boolean;
  scope?: string;
  scriptURL?: string;
  state?: string;
};

type CacheSummary = { name: string; entries: number };

const formatMs = (value?: number) => (typeof value === 'number' ? `${Math.max(0, Math.round(value))}ms` : '—');

const formatAgo = (at: number) => {
  const diff = Date.now() - at;
  if (!Number.isFinite(diff) || diff < 0) return '刚刚';
  const sec = Math.floor(diff / 1000);
  if (sec < 15) return '刚刚';
  if (sec < 60) return `${sec}s 前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min 前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}h 前`;
  const day = Math.floor(hour / 24);
  return `${day}d 前`;
};

const Card = ({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => (
  <section className="rounded-2xl border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
    <header className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
    {children}
  </section>
);

const Home = () => {
  const { user } = useUser();
  const [recent, setRecent] = useState<RecentRoute[]>(() => getRecentRoutes());
  const [pinned, setPinned] = useState<PinnedRoute[]>(() => getPinnedRoutes());
  const [microAppLoads, setMicroAppLoads] = useState<MicroAppLoadMetric[]>(() => getMicroAppLoadMetrics());
  const [perf, setPerf] = useState<PerfSnapshot>({});
  const [sw, setSw] = useState<SwSnapshot>({
    supported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    controlling: false,
  });
  const [cacheSummary, setCacheSummary] = useState<CacheSummary[]>([]);

  const pinnedSet = useMemo(() => new Set(pinned.map((p) => p.path)), [pinned]);

  useEffect(() => subscribeRecentRoutes(setRecent), []);
  useEffect(() => subscribePinnedRoutes(setPinned), []);
  useEffect(() => subscribeMicroAppLoadMetrics(setMicroAppLoads), []);

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')?.[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return;
    setPerf((prev) => ({
      ...prev,
      ttfbMs: nav.responseStart - nav.requestStart,
      dclMs: nav.domContentLoadedEventEnd - nav.startTime,
      loadMs: nav.loadEventEnd - nav.startTime,
    }));
  }, []);

  useEffect(() => {
    let clsValue = 0;
    const supportsObserver = typeof PerformanceObserver !== 'undefined';
    if (!supportsObserver) return;

    const lcpObs = (() => {
      try {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const last = entries[entries.length - 1];
          if (!last) return;
          setPerf((prev) => ({ ...prev, lcpMs: last.startTime }));
        });
        obs.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit);
        return obs;
      } catch {
        return null;
      }
    })();

    const clsObs = (() => {
      try {
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>;
          for (const entry of entries) {
            if (entry.hadRecentInput) continue;
            const value = typeof entry.value === 'number' ? entry.value : 0;
            clsValue += value;
          }
          setPerf((prev) => ({ ...prev, cls: Number(clsValue.toFixed(3)) }));
        });
        obs.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit);
        return obs;
      } catch {
        return null;
      }
    })();

    return () => {
      lcpObs?.disconnect();
      clsObs?.disconnect();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadSw = async () => {
      if (!('serviceWorker' in navigator)) {
        if (alive) setSw({ supported: false, controlling: false });
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const active = registration?.active ?? registration?.waiting ?? registration?.installing ?? undefined;
      if (!alive) return;
      setSw({
        supported: true,
        controlling: Boolean(navigator.serviceWorker.controller),
        scope: registration?.scope,
        scriptURL: active?.scriptURL,
        state: active?.state,
      });
    };

    loadSw().catch(() => undefined);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', loadSw);
    }

    return () => {
      alive = false;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', loadSw);
      }
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadCacheSummary = async () => {
      if (!('caches' in window)) return;
      const names = await caches.keys();
      const items = await Promise.all(
        names.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, entries: keys.length };
        }),
      );
      if (alive) setCacheSummary(items);
    };
    loadCacheSummary().catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const openPalette = () => window.dispatchEvent(new Event('main-app:open-command-palette'));

  const clearRuntimeCaches = async () => {
    if (!('caches' in window)) return;
    if (window.confirm('确认清理缓存并刷新？（会导致离线缓存失效）') === false) return;
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.unregister();
    }
    window.location.reload();
  };

  const microSummary = useMemo(() => {
    const latest = microAppLoads[0];
    const sample = microAppLoads.slice(0, 10);
    const avg =
      sample.length === 0 ? undefined : sample.reduce((sum, m) => sum + m.durationMs, 0) / Math.max(1, sample.length);
    return {
      latest,
      avgMs: avg,
      count: microAppLoads.length,
    };
  }, [microAppLoads]);

  const renderRouteRow = (route: { path: string; label?: string; at?: number }, pinnedEnabled: boolean) => {
    const isPinned = pinnedSet.has(route.path);
    return (
      <div
        key={route.path}
        className="flex items-center justify-between gap-3 rounded-xl border border-[var(--header-border)] px-3 py-2"
      >
        <div className="min-w-0">
          <SafeAppLink to={route.path} className="block truncate text-sm font-medium hover:underline">
            {route.label || route.path}
          </SafeAppLink>
          <div className="truncate text-xs text-[var(--color-muted)]">{route.path}</div>
        </div>
        <div className="flex items-center gap-2">
          {typeof route.at === 'number' && (
            <span className="shrink-0 text-xs text-[var(--color-muted)]">{formatAgo(route.at)}</span>
          )}
          {pinnedEnabled && (
            <button
              type="button"
              onClick={() => togglePinnedRoute({ path: route.path, label: route.label })}
              className={`rounded-md border px-2 py-1 text-xs ${
                isPinned
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-[var(--header-border)] text-[var(--color-muted)]'
              } hover:bg-black/5`}
              aria-label={isPinned ? '取消固定' : '固定到首页'}
            >
              {isPinned ? 'Pinned' : 'Pin'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[var(--color-bg)] px-6 py-6 text-[var(--color-text)]">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">工作台</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] px-3 py-2 text-sm hover:bg-black/5"
          >
            搜索 / Cmd+K
          </button>
          <SafeAppLink
            to="/profile"
            className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] px-3 py-2 text-sm hover:bg-black/5"
          >
            个人资料
          </SafeAppLink>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="我的状态"
          subtitle="登录态 / 权限 / 环境"
          actions={
            <span className="rounded bg-black/10 px-2 py-1 text-xs text-[var(--color-muted)]">
              {process.env.NODE_ENV ?? 'unknown'}
            </span>
          }
        >
          <div className="flex items-center gap-3">
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces'
              }
              className="h-10 w-10 rounded-full border border-[var(--header-border)] object-cover"
              alt="avatar"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user?.username ?? '—'}</div>
              <div className="truncate text-xs text-[var(--color-muted)]">
                roles: {(user?.roles?.length ?? 0).toString()} · perms: {(user?.permissions?.length ?? 0).toString()}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-muted)]">
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-[var(--color-muted-strong)]">API Base</div>
              <div className="truncate">{process.env.API_BASE_URL ?? '/api'}</div>
            </div>
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-[var(--color-muted-strong)]">PWA</div>
              <div className="truncate">{sw.controlling ? 'SW 控制中' : sw.supported ? '未接管' : '不支持'}</div>
            </div>
          </div>
        </Card>

        <Card title="微前端运行面板" subtitle="最近加载耗时（来自 @ice/stark AppRouter）">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-xs text-[var(--color-muted)]">最近一次</div>
              <div className="mt-1 truncate text-sm font-semibold">
                {microSummary.latest
                  ? `${microSummary.latest.name} · ${formatMs(microSummary.latest.durationMs)}`
                  : '—'}
              </div>
              {microSummary.latest?.path && (
                <div className="mt-1 truncate text-xs text-[var(--color-muted)]">{microSummary.latest.path}</div>
              )}
            </div>
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-xs text-[var(--color-muted)]">近 10 次均值</div>
              <div className="mt-1 truncate text-sm font-semibold">{formatMs(microSummary.avgMs)}</div>
              <div className="mt-1 truncate text-xs text-[var(--color-muted)]">样本数：{microSummary.count}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {microAppLoads.slice(0, 4).map((m) => (
              <div key={`${m.at}-${m.name}`} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{m.name}</div>
                  <div className="truncate text-xs text-[var(--color-muted)]">{m.path ?? '—'}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold">{formatMs(m.durationMs)}</div>
                  <div className="text-xs text-[var(--color-muted)]">{formatAgo(m.at)}</div>
                </div>
              </div>
            ))}
            {microAppLoads.length === 0 && (
              <div className="py-4 text-center text-sm text-[var(--color-muted)]">暂无记录</div>
            )}
          </div>
        </Card>

        <Card
          title="性能 / PWA"
          subtitle="导航时延 + Web Vitals（buffered） + 缓存概览"
          actions={
            <button
              type="button"
              onClick={clearRuntimeCaches}
              className="rounded-lg border border-[var(--header-border)] px-3 py-1 text-xs text-[var(--color-muted)] hover:bg-black/5"
            >
              清理缓存
            </button>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-xs text-[var(--color-muted)]">TTFB / DCL</div>
              <div className="mt-1 text-sm font-semibold">
                {formatMs(perf.ttfbMs)} · {formatMs(perf.dclMs)}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-xs text-[var(--color-muted)]">LCP / CLS</div>
              <div className="mt-1 text-sm font-semibold">
                {formatMs(perf.lcpMs)} · {typeof perf.cls === 'number' ? perf.cls.toFixed(3) : '—'}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-muted)]">
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-[var(--color-muted-strong)]">Service Worker</div>
              <div className="truncate">
                {sw.supported ? (sw.controlling ? 'controlling' : 'uncontrolled') : 'unsupported'} · {sw.state ?? '—'}
              </div>
            </div>
            <div className="rounded-lg border border-[var(--header-border)] px-3 py-2">
              <div className="text-[var(--color-muted-strong)]">Cache Storage</div>
              <div className="truncate">{cacheSummary.length ? `${cacheSummary.length} 个 cache` : '—'}</div>
            </div>
          </div>

          {cacheSummary.length > 0 && (
            <div className="mt-3 max-h-24 overflow-auto rounded-lg border border-[var(--header-border)] px-3 py-2 text-xs text-[var(--color-muted)]">
              {cacheSummary.map((c) => (
                <div key={c.name} className="flex items-center justify-between gap-3">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0">{c.entries} entries</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="固定 (Pin)" subtitle="你最常用的入口（支持固定/取消固定）">
          <div className="flex flex-col gap-2">
            {pinned.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--color-muted)]">
                暂无固定。你可以在“最近访问”里 Pin。
              </div>
            ) : (
              pinned.map((item) => renderRouteRow({ path: item.path, label: item.label }, true))
            )}
          </div>
        </Card>

        <Card
          title="最近访问"
          subtitle="自动记录最近路由（可 Pin 到首页）"
          actions={
            <button type="button" className="text-xs text-[var(--color-muted)] hover:underline" onClick={openPalette}>
              打开命令面板
            </button>
          }
        >
          <div className="flex flex-col gap-2">
            {recent.length === 0 ? (
              <div className="py-4 text-center text-sm text-[var(--color-muted)]">暂无记录</div>
            ) : (
              recent.map((item) => renderRouteRow(item, true))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Home;
