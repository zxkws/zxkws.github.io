import React, { createElement } from "react";
import * as queryString from "query-string";
import { loadableReady } from "@loadable/component";

let __initialData__ = undefined;

export const setInitialData = (initialData) => {
  __initialData__ = initialData;
};

export const getInitialData = () => {
  return __initialData__;
};

export const getRenderApp = (runtime, options) => {
  const { ErrorBoundary, appConfig = { app: {} } } = options;
  const AppProvider = runtime?.composeAppProvider?.();
  const AppComponent = runtime?.getAppComponent?.();
  let rootApp = createElement(AppComponent);

  if (AppProvider) {
    rootApp = createElement(AppProvider, null, rootApp);
  }

  const {
    app: {
      ErrorBoundaryFallback,
      onErrorBoundaryHandler,
      errorBoundary,
      strict = false,
    } = {},
  } = appConfig;

  const App = () => {
    if (errorBoundary && ErrorBoundary) {
      rootApp = createElement(
        ErrorBoundary,
        {
          Fallback: ErrorBoundaryFallback,
          onError: onErrorBoundaryHandler,
        },
        rootApp
      );
    }

    if (strict) {
      rootApp = createElement(React.StrictMode, null, rootApp);
    }

    return rootApp;
  };

  return App;
};

export const reactAppRenderer = async (options) => {
  const { appConfig, buildConfig = {}, appLifecycle } = options;
  const { createBaseApp, emitLifeCycles, initAppLifeCycles } = appLifecycle;

  const context = {};
  if (window.__ICE_APP_DATA__) {
    context.initialData = window.__ICE_APP_DATA__;
    context.pageInitialProps = window.__ICE_PAGE_PROPS__;
  } else if (appConfig?.app?.getInitialData) {
    const { href, origin, pathname, search } = window.location;
    const path = href.replace(origin, "");
    const query = queryString.parse(search);
    const ssrError = window.__ICE_SSR_ERROR__;

    const initialContext = {
      pathname,
      path,
      query,
      ssrError,
    };

    context.initialData = await appConfig.app.getInitialData(initialContext);
  }

  const { runtime, appConfig: modifiedAppConfig } = createBaseApp(
    appConfig,
    buildConfig,
    context
  );

  // 初始化应用生命周期
  initAppLifeCycles();

  // 设置初始数据
  setInitialData(context.initialData);

  // 触发应用启动生命周期
  emitLifeCycles();

  return _render(runtime, { ...options, appConfig: modifiedAppConfig });
};

const _render = (runtime, options) => {
  const { appConfig = {} } = options;
  const { app: { rootId, mountNode } = {} } = appConfig;
  const App = getRenderApp(runtime, options);
  const appMountNode = _getAppMountNode(mountNode, rootId);

  if (runtime?.modifyDOMRender) {
    return runtime.modifyDOMRender({ App, appMountNode });
  }

  if (window.__ICE_SSR_ENABLED__ && process.env.SSR) {
    loadableReady(() => {
      ReactDOM.hydrateRoot(appMountNode, createElement(App)); // React 18 使用 hydrateRoot 代替 hydrate
    });
  } else {
    const root = ReactDOM.createRoot(appMountNode); // React 18 使用 createRoot
    root.render(createElement(App));
  }
};

const _getAppMountNode = (mountNode, rootId) => {
  return (
    mountNode ||
    document.getElementById(rootId) ||
    document.getElementById("ice-container")
  );
};
