import { createFetchClient, type FetchRequestConfig, type FetchResponse } from '@zxkws/shared-fetch';
import { mainStore } from '../store';

const resolveBaseUrl = (raw: string) => {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const fallback = isDev ? '/api' : raw || '/api';
  if (typeof window === 'undefined') return fallback;
  return window.location.hostname === 'zxkws.nyc.mn' ? '/api' : raw || fallback;
};

const BASE_URL = resolveBaseUrl(import.meta.env.API_BASE_URL || '');

const getRedirectLogin = () => {
  const current = typeof window === 'undefined' ? '/' : window.location.href;
  const isDev = process.env.NODE_ENV === 'development';
  const base = isDev ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
  return `${base}/#/login?redirect=${encodeURIComponent(current)}`;
};

const bumpLoading = (() => {
  let counter = 0;
  const update = () => {
    try {
      const store = mainStore();
      const active = counter > 0;
      store.setLoading(active);
      store.isLoading = active;
    } catch {
      // Pinia not ready yet; ignore silently.
    }
  };
  return {
    start() {
      counter += 1;
      update();
    },
    end() {
      counter = Math.max(0, counter - 1);
      update();
    },
  };
})();

const client = createFetchClient({
  baseURL: BASE_URL,
  getToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('auth_token')),
  persistToken: (token) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  },
  onUnauthorized: () => {
    if (typeof window === 'undefined') return;
    window.location.href = getRedirectLogin();
  },
  requestInterceptors: [
    (cfg: FetchRequestConfig) => {
      bumpLoading.start();
      return cfg;
    },
  ],
  responseInterceptors: [
    {
      onFulfilled: (res: FetchResponse<unknown>) => {
        bumpLoading.end();
        return res;
      },
      onRejected: (_error: unknown) => {
        bumpLoading.end();
        throw _error;
      },
    },
  ],
});

export const request = client;
export default client;
