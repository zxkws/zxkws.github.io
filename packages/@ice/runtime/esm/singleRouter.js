/**
 * Fake API of react-router-dom, react-router-dom will be remove
 * if user config `optimize.router` false
 */
import * as React from 'react';
import { loadRouteModules } from './routes.js';
const Context = React.createContext(undefined);
Context.displayName = 'DataContext';
export const DataContextProvider = Context.Provider;
export const RouteContext = React.createContext({
    outlet: null,
    matches: [],
    routeData: null,
});
RouteContext.displayName = 'RouteContext';
export function useData() {
    var _a;
    const value = React.useContext(RouteContext);
    return (_a = value.routeData) === null || _a === void 0 ? void 0 : _a.data;
}
export function useConfig() {
    var _a;
    const value = React.useContext(RouteContext);
    return (_a = value.routeData) === null || _a === void 0 ? void 0 : _a.pageConfig;
}
const OutletContext = React.createContext(null);
export function useOutlet(context) {
    let { outlet } = React.useContext(RouteContext);
    if (outlet) {
        return (React.createElement(OutletContext.Provider, { value: context }, outlet));
    }
    return outlet;
}
export function useOutletContext() {
    return React.useContext(OutletContext);
}
export function Outlet(props) {
    return useOutlet(props.context);
}
export function RenderedRoute({ routeContext, children }) {
    return (React.createElement(RouteContext.Provider, { value: routeContext }, children));
}
export const useRoutes = (routes) => {
    return React.createElement(React.Fragment, null, routes[0].element);
};
export const Router = (props) => {
    return React.createElement(React.Fragment, null, props.children);
};
export const createHistory = () => {
    return {
        // @ts-expect-error
        listen: () => { },
        // @ts-expect-error
        action: 'POP',
        // @ts-expect-error
        location: '',
    };
};
const joinPaths = (paths) => paths.join('/').replace(/\/\/+/g, '/');
const flattenRoutes = (routes, branches = [], parentsMeta = [], parentPath = '') => {
    let flattenRoute = (route, index, relativePath) => {
        let routeMeta = {
            relativePath: relativePath === undefined ? route.path || '' : relativePath,
            childrenIndex: index,
            route,
        };
        if (routeMeta.relativePath.startsWith('/')) {
            if (!routeMeta.relativePath.startsWith(parentPath)) {
                throw new Error(`Route path "${routeMeta.relativePath}" nested under path "${parentPath}" is not valid`);
            }
            routeMeta.relativePath = routeMeta.relativePath.slice(parentPath.length);
        }
        let path = joinPaths([parentPath, routeMeta.relativePath]);
        let routesMeta = parentsMeta.concat(routeMeta);
        if (route.children && route.children.length > 0) {
            if (route.index) {
                throw new Error(`Index route should not have children, path "${path}"`);
            }
            flattenRoutes(route.children, branches, routesMeta, path);
        }
        if (route.path == null && !route.index) {
            return;
        }
        branches.push({
            path,
            routesMeta,
        });
    };
    routes.forEach((route, index) => {
        var _a;
        if (route.path === '' || !((_a = route.path) === null || _a === void 0 ? void 0 : _a.includes('?'))) {
            flattenRoute(route, index);
        }
        else {
            throw new Error(`Single Route mode do not support path: "${route.path}"`);
        }
    });
    return branches;
};
function compilePath(path, end = true) {
    let regexpSource = `^${path
        .replace(/\/*\*?$/, '') // Ignore trailing / and /*, we'll handle it below
        .replace(/^\/*/, '/') // Make sure it has a leading /
        .replace(/[\\.*+^${}|()[\]]/g, '\\$&')}`; // Escape special regex chars;
    if (end) {
        // When matching to the end, ignore trailing slashes
        regexpSource += '\\/*$';
    }
    else if (path !== '' && path !== '/') {
        // Keep alignment with react-router:
        // https://github.com/remix-run/react-router/blob/fb0f1f94778f4762989930db209e6a111504aa63/packages/router/utils.ts#L988-L995
        regexpSource += '(?:(?=\\/|$))';
    }
    else {
        // Nothing to match for "" or "/"
    }
    let matcher = new RegExp(regexpSource, 'i');
    return matcher;
}
export function matchPath(pattern, pathname) {
    if (typeof pattern === 'string') {
        pattern = { path: pattern, end: true };
    }
    let matcher = compilePath(pattern.path, pattern.end);
    let match = pathname.match(matcher);
    if (!match)
        return null;
    let matchedPathname = match[0];
    let pathnameBase = matchedPathname.replace(/(.)\/+$/, '$1');
    return {
        // Params is not supported yet in single route mode.
        params: {},
        pathname: matchedPathname,
        pathnameBase,
        pattern,
    };
}
const normalizePathname = (pathname) => pathname.replace(/\/+$/, '').replace(/^\/*/, '/');
const matchRouteBranch = (branch, pathname) => {
    let { routesMeta } = branch;
    let matchedPathname = '/';
    let matches = [];
    const len = routesMeta.length;
    for (let i = 0; i < len; i++) {
        let routeMeta = routesMeta[i];
        let end = i === routesMeta.length - 1;
        let remainingPathname = matchedPathname === '/' ? pathname : pathname.slice(matchedPathname.length) || '/';
        let match = matchPath(
        // TODO: casesensitive is not support yet.
        { path: routeMeta.relativePath, end }, remainingPathname);
        if (!match)
            return null;
        let { route } = routeMeta;
        matches.push({
            // TODO: Can this as be avoided?
            params: {},
            pathname: joinPaths([matchedPathname, match.pathname]),
            pathnameBase: normalizePathname(joinPaths([matchedPathname, match.pathnameBase])),
            route,
        });
        if (match.pathnameBase !== '/') {
            matchedPathname = joinPaths([matchedPathname, match.pathnameBase]);
        }
    }
    return matches;
};
const stripBasename = (pathname, basename) => {
    if (basename === '/')
        return pathname;
    if (!pathname.toLowerCase().startsWith(basename.toLowerCase())) {
        return null;
    }
    const startIndex = basename.endsWith('/')
        ? basename.length - 1
        : basename.length;
    let nextChar = pathname.charAt(startIndex);
    if (nextChar && nextChar !== '/') {
        return null;
    }
    return pathname.slice(startIndex) || '/';
};
export const matchRoutes = (routes, location, basename) => {
    const pathname = (typeof location === 'string' ? location : location.pathname) || '/';
    let stripedPathname = stripBasename(pathname, basename || '/');
    if (!stripedPathname && basename !== '/') {
        // If pathname is not match, we should ignore the basename,
        // in case of the basename is customized.
        stripedPathname = stripBasename(pathname, '/');
    }
    let branches = flattenRoutes(routes);
    if (branches.length === 1) {
        // Just one branch, no need to match.
        return [{
                route: routes[0],
                params: {},
                pathname,
                pathnameBase: '',
            }];
    }
    let matches = null;
    for (let i = 0; matches == null && i < branches.length; i++) {
        matches = matchRouteBranch(branches[i], stripedPathname);
    }
    if (!matches) {
        console.warn('Single route manifest: ', routes);
        console.warn(`Basename "${basename}" is not match with pathname "${pathname}"`);
    }
    return matches;
};
export const Link = () => null;
export const NavLink = () => null;
export const useParams = () => {
    return {};
};
export const useSearchParams = () => {
    return [{}, () => { }];
};
export const useLocation = () => {
    return {};
};
export const useNavigate = () => {
    return {};
};
export const useNavigation = () => {
    throw new Error('useNavigation is not supported in single router mode');
};
export const useRevalidator = () => {
    throw new Error('useRevalidator is not supported in single router mode');
};
export const useAsyncValue = () => {
    throw new Error('useAsyncValue is not supported in single router mode');
};
export const getSingleRoute = async (routes, basename, location, routeModuleCache = {}) => {
    const matchedRoutes = matchRoutes(routes, location, basename);
    const routeModules = await loadRouteModules(matchedRoutes.map(({ route }) => route), routeModuleCache);
    let loaders = [];
    let loaderIds = [];
    const components = matchedRoutes.map(({ route }) => {
        const { loader, Component } = (routeModules === null || routeModules === void 0 ? void 0 : routeModules[route.id]) || {};
        if (loader) {
            loaders.push(loader());
            loaderIds.push(route.id);
        }
        return {
            Component: Component || route.Component,
            isDataRoute: !!loader,
            id: route.id,
        };
    });
    let routesData = {};
    // Compose components.
    const loaderDatas = await Promise.all(loaders);
    loaderDatas.forEach((data, index) => {
        routesData[loaderIds[index]] = data;
    });
    return () => components.reduceRight((outlet, { Component, isDataRoute, id }) => {
        return (React.createElement(RenderedRoute, { routeContext: {
                outlet,
                routeData: isDataRoute && routesData[id],
            }, children: React.createElement(Component, null) || outlet }));
    }, null);
};
