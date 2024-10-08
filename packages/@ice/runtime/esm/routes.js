import React, { Suspense } from 'react';
import { useRouteError, defer, Await as ReactRouterAwait } from 'react-router-dom';
import RouteWrapper from './RouteWrapper.js';
import { useAppContext } from './AppContext.js';
import { callDataLoader } from './dataLoader.js';
import { updateRoutesConfig } from './routesConfig.js';
import { parseSearch } from './requestContext.js';
export function getRoutesPath(routes, parentPath = '') {
    let paths = [];
    routes.forEach((route) => {
        const pathId = `${parentPath}/${route.path || ''}`.replace('//', '/');
        if (route.children) {
            paths.push(...getRoutesPath(route.children, pathId));
        }
        else {
            paths.push(pathId);
        }
    });
    return paths.map(str => str.replace('//', '/'));
}
export async function loadRouteModule(route, routeModulesCache = {}) {
    const { id, lazy } = route;
    if (import.meta.renderer === 'client' && // Don't use module cache and should load again in ssr. Ref: https://github.com/ice-lab/ice-next/issues/82
        id in routeModulesCache) {
        return routeModulesCache[id];
    }
    try {
        const routeModule = await lazy();
        routeModulesCache[id] = routeModule;
        return routeModule;
    }
    catch (error) {
        console.error(`Failed to load route module: ${id}.`);
        // Re-throw error for better debugging.
        throw error;
    }
}
export async function loadRouteModules(routes, originRouteModules = {}) {
    const routeModules = { ...originRouteModules };
    for (const route of routes) {
        const routeModule = await loadRouteModule(route, routeModules);
        routeModules[route.id] = routeModule;
    }
    return routeModules;
}
// Wrap route component with runtime wrappers.
export function WrapRouteComponent(options) {
    const { routeId, isLayout, routeExports } = options;
    const { RouteWrappers } = useAppContext();
    return (React.createElement(RouteWrapper, { routeExports: routeExports, id: routeId, isLayout: isLayout, wrappers: RouteWrappers },
        React.createElement(routeExports.default, null)));
}
export function RouteComponent({ id }) {
    // get current route component from latest routeModules
    const { routeModules } = useAppContext();
    const { Component } = routeModules[id] || {};
    if (process.env.NODE_ENV === 'development') {
        if (!Component) {
            throw new Error(`Route "${id}" has no component! Please go add a \`default\` export in the route module file.\n` +
                'If you were trying to navigate or submit to a resource route, use `<a>` instead of `<Link>` or `<Form reloadDocument>`.');
        }
    }
    return React.createElement(Component, null);
}
function ErrorComponentWithRouter() {
    const error = useRouteError();
    if (error) {
        // Re-throws the error so it can be caught by App Error Boundary.
        throw error;
    }
    return React.createElement(React.Fragment, null);
}
export function RouteErrorComponent() {
    return process.env.ICE_CORE_ROUTER === 'true' ? React.createElement(ErrorComponentWithRouter, null) : React.createElement(React.Fragment, null);
}
export function Await(props) {
    return process.env.ICE_CORE_ROUTER === 'true' ? (React.createElement(Suspense, { fallback: props.fallback },
        React.createElement(ReactRouterAwait, { resolve: props.resolve, errorElement: props.errorElement }, props.children))) : React.createElement(React.Fragment, null, props.children);
}
function getClientLoaderContext(url) {
    // Compatible with browsers do not support URL.
    const patterns = {
        protocol: '(?:([^:/?#]+):)',
        authority: '(?://([^/?#]*))',
        path: '([^?#]*)',
        query: '(\\?[^#]*)',
        hash: '(#.*)',
    };
    const urlRegExp = new RegExp(`^${patterns.protocol}?${patterns.authority}?${patterns.path}${patterns.query}?${patterns.hash}?`);
    const urlMatch = urlRegExp.exec(url);
    return urlMatch ? {
        pathname: urlMatch[3] || '',
        query: parseSearch(urlMatch[4] || ''),
    } : null;
}
export function createRouteLoader(options) {
    let dataLoaderConfig;
    const { dataLoader, pageConfig, staticDataLoader, serverDataLoader } = options.module;
    const { requestContext: defaultRequestContext, renderMode, routeId } = options;
    const globalLoader = (typeof window !== 'undefined' && window.__ICE_DATA_LOADER__) ? window.__ICE_DATA_LOADER__ : null;
    if (import.meta.renderer !== 'client' || process.env.ICE_CORE_REMOVE_DATA_LOADER !== 'true') {
        if (globalLoader) {
            dataLoaderConfig = globalLoader.getLoader(routeId);
        }
        else if (renderMode === 'SSG') {
            dataLoaderConfig = staticDataLoader;
        }
        else if (renderMode === 'SSR') {
            dataLoaderConfig = serverDataLoader || dataLoader;
        }
        else {
            dataLoaderConfig = dataLoader;
        }
    }
    if (!dataLoaderConfig) {
        return async () => {
            const loaderData = {
                pageConfig: pageConfig ? pageConfig({}) : {},
            };
            if (import.meta.renderer === 'client' && process.env.ICE_CORE_REMOVE_ROUTES_CONFIG !== 'true') {
                await updateRoutesConfig(loaderData);
            }
            return loaderData;
        };
    }
    // if ICE_CORE_REMOVE_DATA_LOADER is true, dataLoaderConfig should be null and it already return above.
    // dataLoader should be always called in server side because of the serverDataLoader.
    if (import.meta.renderer !== 'client' || process.env.ICE_CORE_REMOVE_DATA_LOADER !== 'true') {
        let loader;
        let loaderOptions;
        // Compat dataLoaderConfig not return by defineDataLoader.
        if (typeof dataLoaderConfig === 'function' || Array.isArray(dataLoaderConfig)) {
            loader = dataLoaderConfig;
        }
        else {
            loader = dataLoaderConfig.loader;
            loaderOptions = dataLoaderConfig.options;
        }
        const getData = (requestContext) => {
            let routeData;
            if (import.meta.renderer !== 'client' || process.env.ICE_CORE_REMOVE_DATA_LOADER !== 'true') {
                if (globalLoader) {
                    routeData = globalLoader.getData(routeId, { renderMode, requestContext });
                }
                else {
                    routeData = callDataLoader(loader, requestContext);
                }
            }
            return routeData;
        };
        // Async dataLoader.
        if (loaderOptions === null || loaderOptions === void 0 ? void 0 : loaderOptions.defer) {
            if (process.env.ICE_CORE_ROUTER === 'true') {
                return async (params) => {
                    const promise = getData(import.meta.renderer === 'client' ? getClientLoaderContext(params.request.url) : defaultRequestContext);
                    return defer({
                        data: promise,
                        // Call pageConfig without data.
                        pageConfig: pageConfig ? pageConfig({}) : {},
                    });
                };
            }
            else {
                throw new Error('DataLoader: defer is not supported in single router mode.');
            }
        }
        // Await dataLoader before render.
        return async (params) => {
            const result = getData(import.meta.renderer === 'client' && params ? getClientLoaderContext(params.request.url) : defaultRequestContext);
            let routeData;
            try {
                if (Array.isArray(result)) {
                    routeData = await Promise.all(result);
                }
                else if (result instanceof Promise) {
                    routeData = await result;
                }
                else {
                    routeData = result;
                }
            }
            catch (error) {
                if (import.meta.renderer === 'client') {
                    console.error('DataLoader: getData error.\n', error);
                    routeData = {
                        message: 'DataLoader: getData error.',
                        error,
                    };
                }
                else {
                    // Throw to trigger downgrade.
                    throw error;
                }
            }
            const routeConfig = pageConfig ? pageConfig({ data: routeData }) : {};
            const loaderData = {
                data: routeData,
                pageConfig: routeConfig,
            };
            // Update routes config when render mode is CSR.
            if (import.meta.renderer === 'client' && process.env.ICE_CORE_REMOVE_ROUTES_CONFIG !== 'true') {
                await updateRoutesConfig(loaderData);
            }
            return loaderData;
        };
    }
}
