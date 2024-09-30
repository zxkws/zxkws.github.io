import * as React from 'react';
import { useAppContext } from './AppContext.js';
import proxyData from './proxyData.js';
const LOADER = '__ICE_SUSPENSE_LOADER__';
const isClient = typeof window !== 'undefined' && 'onload' in window;
const SuspenseContext = React.createContext(undefined);
const getHydrateData = (id) => {
    let data = null;
    const loaderData = isClient && window[LOADER];
    let hasHydrateData;
    if (loaderData) {
        // Compatible with the old version which use Map to store data.
        if (loaderData.has) {
            hasHydrateData = loaderData.has(id);
            data = window[LOADER].get(id);
        }
        else {
            hasHydrateData = Object.prototype.hasOwnProperty.call(loaderData, id);
            // If hasHydrateData is false, data will be undefined.
            data = window[LOADER][id];
        }
    }
    return {
        hasHydrateData,
        data,
    };
};
export function useSuspenseData(request) {
    const appContext = useAppContext();
    const { requestContext } = appContext;
    const suspenseState = React.useContext(SuspenseContext);
    const { data, done, promise, update, error, id } = suspenseState;
    const { hasHydrateData, data: hydrateData } = getHydrateData(id);
    let thenable = null;
    if (!hasHydrateData && !error && !done && !promise && request) {
        thenable = request(requestContext);
        thenable.then((response) => {
            update({
                done: true,
                data: response,
                promise: null,
            });
        }).catch(e => {
            update({
                done: true,
                error: e,
                promise: null,
            });
        });
    }
    React.useEffect(() => {
        // Update state in useEffect, otherwise it will cause bad setState warning.
        if (thenable) {
            update({
                promise: thenable,
            });
        }
    }, [thenable, update]);
    // 1. Use data from server side directly when hydrate.
    if (hasHydrateData) {
        return hydrateData;
    }
    // 2. Check data request error, if error throw it to react.
    if (error) {
        throw error;
    }
    // 3. If request is done, return data.
    if (done) {
        if (process.env.NODE_ENV === 'development' && typeof data === 'object') {
            return proxyData(data);
        }
        return data;
    }
    // 4. If request is pending, throw the promise to react.
    if (promise) {
        throw promise;
    }
    // 5. If no request, return null.
    if (!request) {
        return null;
    }
    if (!isClient) {
        // 6. Create a promise for the request and throw it to react.
        update({
            promise: thenable,
        });
    }
    throw thenable;
}
export function withSuspense(Component) {
    return (props) => {
        const { fallback, id, ...componentProps } = props;
        const [suspenseState, updateSuspenseData] = React.useState({
            id: id,
            data: null,
            done: false,
            promise: null,
            error: null,
            update,
        });
        function update(value) {
            let newState;
            if (isClient) {
                newState = Object.assign({}, suspenseState, value);
            }
            else {
                // For SSR, setState is not working, so here we need to update the state manually.
                newState = Object.assign(suspenseState, value);
            }
            // For CSR.
            updateSuspenseData(newState);
        }
        return (React.createElement(React.Suspense, { fallback: fallback || null },
            React.createElement(SuspenseContext.Provider, { value: suspenseState },
                React.createElement(Component, { ...componentProps }),
                React.createElement(Data, { id: id }))));
    };
}
function Data(props) {
    const data = useSuspenseData();
    return (React.createElement("script", { dangerouslySetInnerHTML: { __html: `!function(){window['${LOADER}'] = window['${LOADER}'] || {};window['${LOADER}']['${props.id}'] = ${JSON.stringify(data)}}();` } }));
}
