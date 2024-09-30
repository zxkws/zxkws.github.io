import * as React from 'react';
import Runtime from './runtime.js';
import { AppContextProvider } from './AppContext.js';
import { getAppData } from './appData.js';
import getAppConfig from './appConfig.js';
import { DocumentContextProvider } from './Document.js';
import { loadRouteModules } from './routes.js';
import { pipeToString, renderToNodeStream } from './server/streamRender.js';
import getRequestContext from './requestContext.js';
import matchRoutes from './matchRoutes.js';
import getCurrentRoutePath from './utils/getCurrentRoutePath.js';
import ServerRouter from './ServerRouter.js';
import addLeadingSlash from './utils/addLeadingSlash.js';
import { renderDocument } from './renderDocument.js';
import { sendResponse, getLocation } from './server/response.js';
import getDocumentData from './server/getDocumentData.js';
/**
 * Render and return the result as html string.
 */
export async function renderToHTML(requestContext, renderOptions) {
    const result = await doRender(requestContext, renderOptions);
    const { value } = result;
    if (typeof value === 'string' || typeof value === 'undefined') {
        return result;
    }
    const { pipe, fallback } = value;
    try {
        const entryStr = await pipeToString(pipe);
        return {
            value: entryStr,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
            statusCode: 200,
        };
    }
    catch (error) {
        if (renderOptions.disableFallback) {
            throw error;
        }
        console.error('PipeToString error, downgrade to CSR.', error);
        // downgrade to CSR.
        const result = fallback();
        return result;
    }
}
/**
 * Render and send the result to ServerResponse.
 */
export async function renderToResponse(requestContext, renderOptions) {
    const { req, res } = requestContext;
    const result = await doRender(requestContext, renderOptions);
    const { value } = result;
    if (typeof value === 'string' || typeof value === 'undefined') {
        sendResponse(req, res, result);
    }
    else {
        const { pipe, fallback } = value;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        const { streamOptions = {} } = renderOptions;
        const { onShellReady, onShellError, onError, onAllReady } = streamOptions;
        return new Promise((resolve, reject) => {
            // Send stream result to ServerResponse.
            pipe(res, {
                onShellReady: () => {
                    onShellReady && onShellReady();
                },
                onShellError: async (err) => {
                    onShellError && onShellError(err);
                    if (renderOptions.disableFallback) {
                        reject(err);
                        return;
                    }
                    // downgrade to CSR.
                    console.error('PipeToResponse onShellError, downgrade to CSR.');
                    console.error(err);
                    const result = await fallback();
                    sendResponse(req, res, result);
                    resolve();
                },
                onError: (err) => {
                    onError && onError(err);
                    // onError triggered after shell ready, should not downgrade to csr
                    // and should not be throw to break the render process
                    console.error('PipeToResponse error.');
                    console.error(err);
                },
                onAllReady: (params) => {
                    onAllReady && onAllReady(params);
                    resolve();
                },
            });
        });
    }
}
function needRevalidate(matchedRoutes) {
    return matchedRoutes.some(({ route }) => route.exports.includes('dataLoader') && route.exports.includes('staticDataLoader'));
}
async function doRender(serverContext, renderOptions) {
    var _a;
    const { req, res } = serverContext;
    const { app, basename, serverOnlyBasename, createRoutes, documentOnly, disableFallback, assetsManifest, runtimeModules, renderMode, runtimeOptions, serverData, } = renderOptions;
    const finalBasename = addLeadingSlash(serverOnlyBasename || basename);
    const location = getLocation(req.url);
    const requestContext = getRequestContext(location, serverContext);
    const appConfig = getAppConfig(app);
    const routes = createRoutes({
        requestContext,
        renderMode,
    });
    let appData;
    const appContext = {
        appExport: app,
        routes,
        appConfig,
        appData,
        loaderData: {},
        renderMode,
        assetsManifest,
        basename: finalBasename,
        matches: [],
        requestContext,
        serverData,
    };
    const runtime = new Runtime(appContext, runtimeOptions);
    runtime.setAppRouter(ServerRouter);
    // Load static module before getAppData.
    if (runtimeModules.statics) {
        await Promise.all(runtimeModules.statics.map(m => runtime.loadModule(m)).filter(Boolean));
    }
    const documentData = await getDocumentData({
        loaderConfig: renderOptions.documentDataLoader,
        requestContext,
        documentOnly,
    });
    // @TODO: document should have it's own context, not shared with app.
    appContext.documentData = documentData;
    // Not to execute [getAppData] when CSR.
    if (!documentOnly) {
        try {
            appData = await getAppData(app, requestContext);
        }
        catch (err) {
            console.error('Error: get app data error when SSR.', err);
        }
    }
    // HashRouter loads route modules by the CSR.
    if (((_a = appConfig === null || appConfig === void 0 ? void 0 : appConfig.router) === null || _a === void 0 ? void 0 : _a.type) === 'hash') {
        return renderDocument({ matches: [], routes, renderOptions, documentData });
    }
    const matches = matchRoutes(routes, location, finalBasename);
    const routePath = getCurrentRoutePath(matches);
    if (documentOnly) {
        return renderDocument({ matches, routePath, routes, renderOptions, documentData });
    }
    else if (!matches.length) {
        return handleNotFoundResponse();
    }
    try {
        const routeModules = await loadRouteModules(matches.map(({ route: { id, lazy } }) => ({ id, lazy })));
        const loaderData = {};
        for (const routeId in routeModules) {
            const { loader } = routeModules[routeId];
            if (loader) {
                const { data, pageConfig } = await loader();
                loaderData[routeId] = {
                    data,
                    pageConfig,
                };
            }
        }
        const revalidate = renderMode === 'SSG' && needRevalidate(matches);
        runtime.setAppContext({ ...appContext, revalidate, routeModules, loaderData, routePath, matches, appData });
        if (runtimeModules.commons) {
            await Promise.all(runtimeModules.commons.map(m => runtime.loadModule(m)).filter(Boolean));
        }
        /**
           Plugin may register response handlers, for example:
           ```
           addResponseHandler((req) => {
             if (redirect) {
               return {
                 statusCode: 302,
                 statusText: 'Found',
                 headers: {
                   location: '/redirect',
                 },
               };
             }
           });
           ```
         */
        const responseHandlers = runtime.getResponseHandlers();
        for (const responseHandler of responseHandlers) {
            if (typeof responseHandler === 'function') {
                const response = await responseHandler(req, res);
                if (response) {
                    return response;
                }
            }
        }
        return await renderServerEntry({
            runtime,
            matches,
            location,
            renderOptions,
        });
    }
    catch (err) {
        if (disableFallback) {
            throw err;
        }
        console.error('Warning: render server entry error, downgrade to csr.', err);
        return renderDocument({ matches, routePath, renderOptions, routes, downgrade: true, documentData });
    }
}
// https://github.com/ice-lab/ice-next/issues/133
function handleNotFoundResponse() {
    return {
        statusText: 'Not Found',
        statusCode: 404,
    };
}
/**
 * Render App by SSR.
 */
async function renderServerEntry({ runtime, matches, location, renderOptions, }) {
    const { Document } = renderOptions;
    const appContext = runtime.getAppContext();
    const { routes, routePath, loaderData, basename } = appContext;
    const AppRuntimeProvider = runtime.composeAppProvider() || React.Fragment;
    const AppRouter = runtime.getAppRouter();
    const routerContext = {
        // @ts-expect-error matches type should be use `AgnosticDataRouteMatch[]`
        matches,
        basename,
        loaderData,
        location,
    };
    const documentContext = {
        main: (React.createElement(AppRouter, { routes: routes, routerContext: routerContext })),
    };
    const element = (React.createElement(AppContextProvider, { value: appContext },
        React.createElement(AppRuntimeProvider, null,
            React.createElement(DocumentContextProvider, { value: documentContext }, Document && React.createElement(Document, { pagePath: routePath })))));
    const pipe = renderToNodeStream(element, {
        renderOptions,
        routerContext,
    });
    const fallback = () => {
        return renderDocument({
            matches,
            routePath,
            renderOptions,
            routes,
            downgrade: true,
            documentData: appContext.documentData,
        });
    };
    return {
        value: {
            pipe,
            fallback,
        },
    };
}
