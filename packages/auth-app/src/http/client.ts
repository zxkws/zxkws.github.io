import { createFetchClient, type FetchRequestConfig, type FetchResponse } from '@zxkws/shared-fetch';
import { API_BASE } from '../config';

const client = createFetchClient({
  baseURL: API_BASE,
  persistToken: (token) => localStorage.setItem('auth_token', token),
});

export default client;
export { client };
