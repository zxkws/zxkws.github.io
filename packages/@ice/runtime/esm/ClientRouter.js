import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { createRouter } from '@remix-run/router';
import App from './App.js';
import { useAppContext } from './AppContext.js';
import { setHistory } from './history.js';
import { disableHistoryWarning } from './utils/deprecatedHistory.js';
function createRouterHistory(history, router) {
    const routerHistory = history;
    routerHistory.push = (to, state) => {
        router.navigate(to, { replace: false, state });
    };
    routerHistory.replace = (to, state) => {
        router.navigate(to, { replace: true, state });
    };
    routerHistory.go = (delta) => {
        router.navigate(delta);
    };
    return routerHistory;
}
let router = null;
function ClientRouter(props) {
    const { Component, routerContext } = props;
    const { revalidate } = useAppContext();
    function clearRouter() {
        if (router) {
            router.dispose();
            router = null;
        }
    }
    // API createRouter only needs to be called once, and create before mount.
    if (process.env.ICE_CORE_ROUTER === 'true') {
        // Clear router before re-create in case of hot module replacement.
        clearRouter();
        // @ts-expect-error routes type should be AgnosticBaseRouteObject[]
        router = createRouter(routerContext).initialize();
        disableHistoryWarning();
        // Replace history methods by router navigate for backwards compatibility.
        setHistory(createRouterHistory({ ...routerContext.history }, router));
    }
    useEffect(() => {
        if (revalidate) {
            // Revalidate after render for SSG while staticDataLoader and dataLoader both defined.
            router === null || router === void 0 ? void 0 : router.revalidate();
        }
        return () => {
            // In case of micro app, ClientRouter will be unmounted,
            // duspose router before mount again.
            clearRouter();
        };
    }, [revalidate]);
    let element;
    if (process.env.ICE_CORE_ROUTER === 'true') {
        element = React.createElement(RouterProvider, { router: router, fallbackElement: null });
    }
    else {
        element = React.createElement(Component, null);
    }
    return (React.createElement(App, null, element));
}
export default ClientRouter;
