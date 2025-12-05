// Helper to remove auth-related storage and cookies.
// It is intentionally defensive to cover different domains/paths the app might have been served from.
export const clearAuthArtifacts = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // 1) Clear storage items that may keep the user "logged in" locally.
  ['auth_token', 'token', 'jwt', 'id'].forEach((key) => {
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

  // 2) Expire cookies as broadly as possible (current host + parent domains, common paths).
  const cookieNames = new Set<string>(
    document.cookie
      .split(';')
      .map((c) => c.split('=')[0]?.trim())
      .filter(Boolean) as string[],
  );
  // Ensure critical auth cookie names are also covered even if HttpOnly (cannot be read).
  ['jwt', 'connect.sid', 'auth_token', 'token', 'sid'].forEach((name) => cookieNames.add(name));

  const domains = (() => {
    const host = window.location.hostname;
    const parts = host.split('.');
    const list = ['']; // current host (no explicit domain attribute)
    if (parts.length >= 2) {
      list.push(`.${parts.slice(-2).join('.')}`);
    }
    if (parts.length >= 3) {
      list.push(`.${parts.slice(-3).join('.')}`);
    }
    // Known production apex for safety.
    list.push('.zxkws.nyc.mn');
    return Array.from(new Set(list.filter(Boolean)));
  })();

  const paths = ['/', '/auth-app', '/app', '/v-app', '/config-hub'];

  const expireCookie = (name: string, domain: string, path: string, extra: string[] = []) => {
    const attrs = [
      `${name}=`,
      'Max-Age=0',
      'expires=Thu, 01 Jan 1970 00:00:00 GMT',
      `path=${path}`,
      domain ? `domain=${domain}` : '',
      ...extra,
    ].filter(Boolean);
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

export default clearAuthArtifacts;
