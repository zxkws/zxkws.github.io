const PUBLIC_EXACT_PATHS = new Set([
  '/',
  '/chess-mirror',
  '/app/watch-together',
  '/textdiff',
  '/v-app/text-difference',
  '/v-app/json-viewer',
]);

const PUBLIC_PATH_PREFIXES = ['/chess-mirror/', '/tools/', '/v-app/text-difference/', '/v-app/json-viewer/'];

export const isPublicPath = (pathname: string) =>
  PUBLIC_EXACT_PATHS.has(pathname) || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
