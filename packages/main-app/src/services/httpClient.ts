import { createFetchClient, type FetchRequestConfig, type FetchResponse } from '@zxkws/shared-fetch';
import { popLoading, pushLoading } from './networkLoading';

const BASE_URL = process.env.API_BASE_URL || '/api';

const client = createFetchClient({
  baseURL: BASE_URL,
  getToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('auth_token')),
  persistToken: (token) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  },
  requestInterceptors: [
    (config: FetchRequestConfig) => {
      pushLoading();
      return config;
    },
  ],
  responseInterceptors: [
    {
      onFulfilled: (res: FetchResponse<unknown>) => {
        popLoading();
        return res;
      },
      onRejected: (error: unknown) => {
        popLoading();
        throw error;
      },
    },
  ],
});

export default client;
export { client };
