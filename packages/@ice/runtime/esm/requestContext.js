/**
 * context for getData both in server and client side.
 */
export default function getRequestContext(location, serverContext = {}) {
    var _a;
    const { pathname, search } = location;
    // Use query form server context first to avoid unnecessary parsing.
    // @ts-ignore
    const query = ((_a = serverContext === null || serverContext === void 0 ? void 0 : serverContext.req) === null || _a === void 0 ? void 0 : _a.query) || parseSearch(search);
    const requestContext = {
        ...(serverContext || {}),
        pathname,
        query,
    };
    return requestContext;
}
/**
 * Search string to object
 * URLSearchParams is not compatible with iOS9 and IE.
 */
export function parseSearch(search) {
    // remove first '?'
    if (search.indexOf('?') === 0) {
        search = search.slice(1);
    }
    const result = {};
    let pairs = search.split('&');
    for (let j = 0; j < pairs.length; j++) {
        const value = pairs[j];
        const index = value.indexOf('=');
        if (index > -1) {
            const k = value.slice(0, index);
            const v = value.slice(index + 1);
            result[k] = v;
        }
        else if (value) {
            result[value] = '';
        }
    }
    return result;
}
