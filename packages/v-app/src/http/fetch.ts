import { createFetchClient } from '@zxkws/shared-fetch';

const BASE_URL = process.env.NODE_ENV === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api';

const getRedirectLogin = () => {
  const current = typeof window === 'undefined' ? '/' : window.location.href;
  return `/auth/login?redirect=${encodeURIComponent(current)}`;
};

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
});

export const request = client;
export default client;
