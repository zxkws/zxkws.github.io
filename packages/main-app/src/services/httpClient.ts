import { createFetchClient, type FetchRequestConfig, type FetchResponse } from '@zxkws/shared-fetch';
import { popLoading, pushLoading } from './networkLoading';

const BASE_URL = process.env.API_BASE_URL || '/api';
const shouldSendAuthHeader = (() => {
  if (typeof window === 'undefined') return true;
  if (!BASE_URL || typeof BASE_URL !== 'string') return true;
  if (!BASE_URL.startsWith('http')) return true;
  try {
    const apiUrl = new URL(BASE_URL);
    // Same-origin request won't trigger CORS preflight for Authorization.
    if (apiUrl.origin === window.location.origin) {
      return true;
    }

    const isZxkwsSite = (hostname: string) => hostname === 'zxkws.nyc.mn' || hostname.endsWith('.zxkws.nyc.mn');
    // Cross-origin but same-site (e.g. zxkws.nyc.mn -> system.zxkws.nyc.mn): prefer cookie auth to avoid OPTIONS.
    if (isZxkwsSite(window.location.hostname) && isZxkwsSite(apiUrl.hostname)) {
      return false;
    }

    // For other cross-site deployments (e.g. accessing via zxkws.github.io), fall back to Authorization header.
    return true;
  } catch {
    return true;
  }
})();

const createClient = ({ withLoading }: { withLoading: boolean }) =>
  createFetchClient({
    baseURL: BASE_URL,
    // Cross-origin requests (e.g. system.zxkws.nyc.mn) will trigger CORS preflight when sending Authorization.
    // Prefer cookie-based auth in those cases to keep GETs "simple" and avoid OPTIONS latency.
    getToken: () =>
      typeof window === 'undefined' || !shouldSendAuthHeader ? null : localStorage.getItem('auth_token'),
    persistToken: (token) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem('auth_token', token);
    },
    ...(withLoading
      ? {
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
        }
      : {}),
  });

const client = createClient({ withLoading: true });
const backgroundClient = createClient({ withLoading: false });

export default client;
export { client, backgroundClient };
