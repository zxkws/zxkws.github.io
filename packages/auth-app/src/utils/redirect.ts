const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const resolveRedirectUrl = (raw: unknown, fallback?: string): URL => {
  const safeFallback = (() => {
    if (typeof window === 'undefined') return 'http://localhost/';
    return fallback && isHttpUrl(fallback) ? fallback : `${window.location.origin}/`;
  })();

  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    // Absolute http(s)
    if (isHttpUrl(trimmed)) {
      return new URL(trimmed);
    }

    // Same-origin relative path
    if (typeof window !== 'undefined' && trimmed.startsWith('/')) {
      return new URL(trimmed, window.location.origin);
    }
  }

  return new URL(safeFallback);
};

export const buildRedirectHref = (rawRedirect: unknown, fallback?: string) =>
  resolveRedirectUrl(rawRedirect, fallback).toString();
