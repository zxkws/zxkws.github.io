import { createFetchClient, resolveApiBase, type FetchRequestConfig, type FetchResponse } from '@zxkws/shared-fetch';
import { startLoading, stopLoading } from './loading';

const BASE_URL = resolveApiBase({
  rawBase: import.meta.env.API_BASE_URL,
  dev: import.meta.env.DEV || import.meta.env.MODE === 'development',
});

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
