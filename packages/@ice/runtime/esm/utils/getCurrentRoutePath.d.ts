import type { RouteMatch } from '../types.js';
/**
 * Get the current route path exclude the basename.
 */
export default function getCurrentRoutePath(matches: RouteMatch[]): string | undefined;
