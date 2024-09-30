import { parsePath } from 'history';
export async function sendResponse(req, res, response) {
    res.statusCode = response.statusCode;
    res.statusMessage = response.statusText;
    Object.entries(response.headers || {}).forEach(([name, value]) => {
        res.setHeader(name, value);
    });
    if (response.value && req.method !== 'HEAD') {
        res.end(response.value);
    }
    else {
        res.end();
    }
}
/**
 * ref: https://github.com/remix-run/react-router/blob/main/packages/react-router-dom/server.tsx
 */
const REGEXP_WITH_HOSTNAME = /^https?:\/\/[^/]+/i;
export function getLocation(url) {
    // In case of invalid URL, provide a default base url.
    const locationPath = url.replace(REGEXP_WITH_HOSTNAME, '') || '/';
    const locationProps = parsePath(locationPath);
    const location = {
        pathname: locationProps.pathname || '/',
        search: locationProps.search || '',
        hash: locationProps.hash || '',
        state: null,
        key: 'default',
    };
    return location;
}
