import { matchRoutes as originMatchRoutes } from 'react-router-dom';
import { matchRoutes as matchRoutesSingle } from './singleRouter.js';
export default function matchRoutes(routes, location, basename) {
    const matchRoutesFn = process.env.ICE_CORE_ROUTER === 'true' ? originMatchRoutes : matchRoutesSingle;
    let matches = matchRoutesFn(routes, location, basename);
    if (!matches)
        return [];
    return matches.map(({ params, pathname, pathnameBase, route }) => ({
        params,
        pathname,
        route: route,
        pathnameBase,
    }));
}
