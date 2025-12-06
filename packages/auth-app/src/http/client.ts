import { createFetchClient, type FetchRequestConfig, type FetchResponse } from '@zxkws/shared-fetch';
import { startLoading, stopLoading } from './loading';

const apiBase = import.meta.env.MODE === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api';

const client = createFetchClient({
  baseURL: apiBase,
  persistToken: (token) => localStorage.setItem('auth_token', token),
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
export { client };
