import React, { Suspense, lazy } from 'react';
import useMounted from './useMounted.js';
const isServer = import.meta.renderer === 'server';
// Normalize loader to return the module as form { default: Component } for `React.lazy`.
function convertModule(mod) {
    return { default: (mod === null || mod === void 0 ? void 0 : mod.default) || mod };
}
const DefaultFallback = () => null;
export function dynamic(loader, option) {
    const { ssr = true, fallback = DefaultFallback } = option || {};
    let realLoader;
    // convert dynamic(import('xxx')) to dynamic(() => import('xxx'))
    if (loader instanceof Promise) {
        realLoader = () => loader;
    }
    else if (typeof loader === 'function') {
        realLoader = loader;
    }
    if (!realLoader)
        return DefaultFallback;
    const Fallback = fallback;
    if (!ssr && isServer) {
        return () => React.createElement(Fallback, null);
    }
    const LazyComp = lazy(() => realLoader().then(convertModule));
    return (props) => {
        const hasMounted = useMounted();
        return ssr || hasMounted ? (React.createElement(Suspense, { fallback: React.createElement(Fallback, null) },
            React.createElement(LazyComp, { ...props }))) : (React.createElement(Fallback, null));
    };
}
