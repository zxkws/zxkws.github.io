export const clearAuthArtifacts = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Clear local storage items that may keep the user "logged in" locally.
  const storageKeys = ['auth_token', 'token', 'jwt', 'id'] as const;
  storageKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  // Expire known auth cookies. Backend should clear session, this is a safe client fallback.
  const cookieNames = ['jwt', 'connect.sid', 'auth_token', 'token', 'sid'] as const;

  const domains = (() => {
    const host = window.location.hostname;
    const list = ['']; // current host (no explicit domain attribute)
    if (host === 'zxkws.nyc.mn' || host.endsWith('.zxkws.nyc.mn')) {
      list.push('.zxkws.nyc.mn');
    }
    return list;
  })();

  const paths = ['/', '/auth-app', '/app', '/v-app', '/v-react'];

  const expireCookie = (name: string, domain: string, path: string, extra: string[] = []) => {
    const attrs = [
      `${name}=`,
      'Max-Age=0',
      'expires=Thu, 01 Jan 1970 00:00:00 GMT',
      `path=${path}`,
      domain ? `domain=${domain}` : '',
      ...extra,
    ].filter(Boolean);
    // biome-ignore lint/suspicious/noDocumentCookie: legacy cookie cleanup for cross-domain logout
    document.cookie = attrs.join('; ');
  };

  cookieNames.forEach((name) => {
    domains.forEach((domain) => {
      paths.forEach((path) => {
        expireCookie(name, domain, path);
        // Also attempt with SameSite=None/ Secure for cookies that were set that way.
        expireCookie(name, domain, path, ['SameSite=None', 'Secure']);
      });
    });
  });
};
