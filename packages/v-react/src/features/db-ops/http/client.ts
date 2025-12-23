import { createFetchClient, type FetchRequestConfig, type FetchResponse } from '@zxkws/shared-fetch';
import { startLoading, stopLoading } from './loading';

const resolveBaseUrl = (raw: string) => {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const fallback = isDev ? '/api' : raw || '/api';
  if (typeof window === 'undefined') return fallback;
  return window.location.hostname === 'zxkws.nyc.mn' ? '/api' : raw || fallback;
};

const BASE_URL = resolveBaseUrl(import.meta.env.API_BASE_URL || '');

export const client = createFetchClient({
  baseURL: BASE_URL,
  getToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('auth_token')),
  persistToken: (token) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  },
  onUnauthorized: () => {
    // 交由上层处理
  },
  requestInterceptors: [
    (cfg: FetchRequestConfig) => {
      startLoading();
      return cfg;
    },
  ],
  responseInterceptors: [
    {
      onFulfilled: (res: FetchResponse<unknown>) => {
        stopLoading();
        return res;
      },
      onRejected: (err: unknown) => {
        stopLoading();
        throw err;
      },
    },
  ],
});

export default client;
