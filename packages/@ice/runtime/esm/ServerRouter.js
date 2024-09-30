import React from 'react';
import { StaticRouterProvider, createStaticRouter } from 'react-router-dom/server.mjs';
import { RouteComponent } from './routes.js';
import App from './App.js';
function createServerRoutes(routes) {
    return routes.map((route) => {
        var _a;
        let dataRoute = {
            // Static Router need element or Component when matched.
            element: React.createElement(RouteComponent, { id: route.id }),
            id: route.id,
            index: route.index,
            path: route.path,
            children: null,
        };
        if (((_a = route === null || route === void 0 ? void 0 : route.children) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            let children = createServerRoutes(route.children);
            dataRoute.children = children;
        }
        return dataRoute;
    });
}
function ServerRouter(props) {
    const { routerContext, routes } = props;
    // Server router only be called once.
    const router = createStaticRouter(createServerRoutes(routes), routerContext);
    return (React.createElement(App, null,
        React.createElement(StaticRouterProvider, { router: router, context: routerContext, hydrate: false })));
}
export default ServerRouter;
