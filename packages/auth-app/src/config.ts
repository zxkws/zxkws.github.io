import { resolveApiBase } from '@zxkws/shared-fetch';

export const API_BASE = resolveApiBase({
  rawBase: import.meta.env.API_BASE_URL,
  dev: import.meta.env.DEV || import.meta.env.MODE === 'development',
});
