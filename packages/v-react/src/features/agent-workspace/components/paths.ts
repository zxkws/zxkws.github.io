export function workspacePath(path = '') {
  const suffix = path === '' || path.startsWith('/') ? path : `/${path}`;
  return `/agent-workspace${suffix}`;
}
