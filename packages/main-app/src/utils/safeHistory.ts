type HistoryStateLike = Record<string, unknown> & {
  usr?: unknown;
  key?: string;
  idx?: number;
};

const createKey = () => Math.random().toString(36).slice(2, 10);

const readState = (): HistoryStateLike => {
  if (typeof window === 'undefined') return {};
  const raw = window.history.state;
  if (!raw || typeof raw !== 'object') return {};
  return raw as HistoryStateLike;
};

const readIdx = (state: HistoryStateLike) => {
  const idx = state.idx;
  return typeof idx === 'number' && Number.isFinite(idx) ? idx : 0;
};

const buildNextState = (replace: boolean): HistoryStateLike => {
  const current = readState();
  const currentIdx = readIdx(current);
  const nextIdx = replace ? currentIdx : currentIdx + 1;

  return {
    ...current,
    // Keep compatibility with React Router/@remix-run/router browser history state shape.
    usr: null,
    key: createKey(),
    idx: nextIdx,
  };
};

export const ensureHistoryIdx = () => {
  if (typeof window === 'undefined') return;
  const current = readState();
  if (typeof current.idx === 'number' && Number.isFinite(current.idx)) return;
  const url = window.location.pathname + window.location.search + window.location.hash;
  window.history.replaceState(buildNextState(true), '', url || '/');
};

export const pushUrl = (url: string) => {
  if (typeof window === 'undefined') return;
  window.history.pushState(buildNextState(false), '', url);
};

export const replaceUrl = (url: string) => {
  if (typeof window === 'undefined') return;
  window.history.replaceState(buildNextState(true), '', url);
};
