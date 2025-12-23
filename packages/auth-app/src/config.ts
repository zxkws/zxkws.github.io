const resolveBaseUrl = (raw: string) => {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const fallback = isDev ? '/api' : raw || '/api';
  if (typeof window === 'undefined') return fallback;
  return window.location.hostname === 'zxkws.nyc.mn' ? '/api' : raw || fallback;
};

export const API_BASE = resolveBaseUrl(import.meta.env.API_BASE_URL || '');
