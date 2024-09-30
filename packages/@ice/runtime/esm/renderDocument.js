import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';
import getAppConfig from './appConfig.js';
import { AppContextProvider } from './AppContext.js';
import { DocumentContextProvider } from './Document.js';
import addLeadingSlash from './utils/addLeadingSlash.js';
import getRequestContext from './requestContext.js';
import matchRoutes from './matchRoutes.js';
import getDocumentData from './server/getDocumentData.js';
import getCurrentRoutePath from './utils/getCurrentRoutePath.js';
import { sendResponse, getLocation } from './server/response.js';
export function renderDocument(options) {
    const { matches, renderOptions, routePath = '', downgrade, routes, documentData, } = options;
    const { assetsManifest, app, Document, basename, routesConfig = {}, serverData, } = renderOptions;
    const appData = null;
    const appConfig = getAppConfig(app);
    const loaderData = {};
    matches.forEach(async (match) => {
        const { id } = match.route;
        const pageConfig = routesConfig[id];
        loaderData[id] = {
            pageConfig: pageConfig ? pageConfig({}) : {},
        };
    });
    const appContext = {
        assetsManifest,
        appConfig,
        appData,
        loaderData,
        matches,
        routes,
        documentOnly: true,
        renderMode: 'CSR',
        routePath,
        basename,
        downgrade,
        serverData,
        documentData,
    };
    const documentContext = {
        main: null,
    };
    const htmlStr = ReactDOMServer.renderToString(React.createElement(AppContextProvider, { value: appContext },
        React.createElement(DocumentContextProvider, { value: documentContext }, Document && React.createElement(Document, { pagePath: routePath }))));
    return {
        value: `<!DOCTYPE html>${htmlStr}`,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
        statusCode: 200,
    };
}
export async function getDocumentResponse(serverContext, renderOptions) {
    var _a;
    const { req } = serverContext;
    const { app, basename, serverOnlyBasename, createRoutes, documentOnly, renderMode, } = renderOptions;
    const finalBasename = addLeadingSlash(serverOnlyBasename || basename);
    const location = getLocation(req.url);
    const requestContext = getRequestContext(location, serverContext);
    const appConfig = getAppConfig(app);
    const routes = createRoutes({
        requestContext,
        renderMode,
    });
    const documentData = await getDocumentData({
        loaderConfig: renderOptions.documentDataLoader,
        requestContext,
        documentOnly,
    });
    const matches = ((_a = appConfig === null || appConfig === void 0 ? void 0 : appConfig.router) === null || _a === void 0 ? void 0 : _a.type) === 'hash' ? [] : matchRoutes(routes, location, finalBasename);
    const routePath = getCurrentRoutePath(matches);
    return renderDocument({ matches, routePath, routes, renderOptions, documentData });
}
export async function renderToResponse(requestContext, renderOptions) {
    const { req, res } = requestContext;
    const documentResoponse = await getDocumentResponse(requestContext, renderOptions);
    sendResponse(req, res, documentResoponse);
}
