/**
 * Get the current route path exclude the basename.
 */
export default function getCurrentRoutePath(matches) {
    return matches.length && matches[matches.length - 1].pathname;
}
