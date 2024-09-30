import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { routerHistory as history } from './history.js';
import { useData, useConfig } from './RouteContext.js';
import { useData as useSingleRouterData, useConfig as useSingleRouterConfig } from './singleRouter.js';
import { useAppContext } from './AppContext.js';
class Runtime {
    constructor(appContext, runtimeOptions) {
        this.getAppContext = () => {
            return {
                ...this.appContext,
                RouteWrappers: this.RouteWrappers,
            };
        };
        this.setAppContext = (appContext) => {
            this.appContext = appContext;
        };
        this.getRender = () => {
            return this.render;
        };
        this.getWrappers = () => this.RouteWrappers;
        this.addProvider = (Provider) => {
            // must promise user's providers are wrapped by the plugins' providers
            this.AppProvider.unshift(Provider);
        };
        this.setRender = (render) => {
            this.render = render;
        };
        this.addWrapper = (Wrapper, forLayout) => {
            this.RouteWrappers.push({
                Wrapper,
                layout: forLayout,
            });
        };
        this.setAppRouter = (AppRouter) => {
            this.AppRouter = AppRouter;
        };
        this.addResponseHandler = (handler) => {
            this.responseHandlers.push(handler);
        };
        this.getResponseHandlers = () => {
            return this.responseHandlers;
        };
        this.AppProvider = [];
        this.appContext = appContext;
        this.render = (container, element) => {
            const root = ReactDOM.createRoot(container);
            root.render(element);
            return root;
        };
        this.RouteWrappers = [];
        this.runtimeOptions = runtimeOptions;
        this.responseHandlers = [];
        this.getAppRouter = this.getAppRouter.bind(this);
    }
    getAppRouter() {
        return this.AppRouter;
    }
    async loadModule(module) {
        let runtimeAPI = {
            addProvider: this.addProvider,
            addResponseHandler: this.addResponseHandler,
            getResponseHandlers: this.getResponseHandlers,
            getAppRouter: this.getAppRouter,
            setRender: this.setRender,
            addWrapper: this.addWrapper,
            appContext: this.appContext,
            setAppRouter: this.setAppRouter,
            useData: process.env.ICE_CORE_ROUTER === 'true' ? useData : useSingleRouterData,
            useConfig: process.env.ICE_CORE_ROUTER === 'true' ? useConfig : useSingleRouterConfig,
            useAppContext,
            history,
        };
        const runtimeModule = (module.default || module);
        if (module) {
            return await runtimeModule(runtimeAPI, this.runtimeOptions);
        }
    }
    composeAppProvider() {
        if (!this.AppProvider.length)
            return null;
        return this.AppProvider.reduce((ProviderComponent, CurrentProvider) => {
            return ({ children, ...rest }) => {
                const element = CurrentProvider
                    ? React.createElement(CurrentProvider, { ...rest }, children)
                    : children;
                return React.createElement(ProviderComponent, { ...rest }, element);
            };
        });
    }
}
export default Runtime;
