import * as urlParse from 'url-Parse';

// 标记旧资源 start
type StaticNodeList = Array<HTMLLinkElement | HTMLScriptElement | HTMLStyleElement>;

function getAssetsNode(): StaticNodeList {
  let nodeList: StaticNodeList = [];
  ['link', 'script', 'style'].forEach((tag) => {
    nodeList = [...nodeList, ...Array.from(document.getElementsByTagName(tag))] as StaticNodeList;
  });

  return nodeList;
}

const PREFIX = 'micro';
const STATIC = 'static';
const DYNAMIC = 'dynamic';

export function recordAssets() {
  const assetsList = getAssetsNode();
  assetsList.forEach((node) => {
    if (node.getAttribute(PREFIX) !== DYNAMIC) {
      node.setAttribute(PREFIX, STATIC);
    }
  });
}
// 标记旧资源 end

// 封装appHistory start
export type RouteType = 'replaceState' | 'pushState';
declare global {
  interface PopStateEvent {
    trigger?: RouteType & {};
  }
}
function createPopStateEvent(eventName, state) {
  const event = new PopStateEvent('popstate', { state });
  event.trigger = eventName;
  return event;
}

export interface AppHistory {
  push: (url: string, state?: any, unused?: string) => void;
  replace: (url: string, state?: any, unused?: string) => void;
}

export const appHistory: AppHistory = {
  push(url, state = null, unused = '') {
    window.history.pushState(state, unused, url);
    const event = createPopStateEvent('pushState', state);
    window.dispatchEvent(event);
  },
  replace(url, state = null, unused = '') {
    window.history.replaceState(state, unused, url);
    const event = createPopStateEvent('replaceState', state);
    window.dispatchEvent(event);
  },
};

// 封装 appHistory end

// 微应用配置 start
interface BaseConfig {
  name: string;
  activePath: string;
  title?: string;
}

export interface AppConfig extends BaseConfig {
  findActivePath: () => boolean;
  status: string;
}

let microApps: AppConfig[] = [];

declare global {
  interface Window {
    microApps?: AppConfig[];
  }
}

window.microApps = microApps;

export function updateAppConfig(appName, appConfig) {
  microApps = microApps.map((microApp) => {
    if (microApp.name === appName) {
      return {
        ...microApp,
        ...appConfig,
      };
    }
    return microApp;
  });
}

function getAllAppNames() {
  return microApps.map((microApp) => microApp.name);
}

export function getAppStatus(appName: string) {
  const app = microApps.find((microApp) => appName === microApp.name);
  return app ? app.status : '';
}

export function getMicroApps() {
  return microApps;
}

export const registerMicroApp = (appConfig: BaseConfig) => {
  const newConfig = {
    ...appConfig,
    findActivePath: () => true,
    status: '',
  };
  microApps.push(newConfig);
};

export const registerMicroApps = (appConfigs: BaseConfig[]) => {
  appConfigs.forEach((appConfig) => {
    if (getAllAppNames().includes(appConfig.name)) {
      console.error(`${appConfig.name} has registered`);
    } else {
      registerMicroApp(appConfig);
    }
  });
};

// 微应用配置 end

// 激活微应用 start
declare global {
  interface HTMLIFrameElement {
    loading: string;
  }
}
function loadApp(appConfig) {
  const { title, iframe: iframeUrl } = appConfig;
  if (title) {
    document.title = title;
  }
  if (iframeUrl) {
    const iframe = document.createElement('iframe') as HTMLIFrameElement;
    iframe.loading = 'lazy';
    iframe.src = iframeUrl;
    document.getElementById('child-container')?.appendChild(iframe);
  }
}

function createMicroApp(
  app: AppConfig,
  //   appLifeCycle?: AppLifeCycleOptions,
  //   configuration?: StartConfiguration,
) {
  loadApp(app);
}

// 激活微应用 end

// GlobalConfiguration start

export interface GlobalConfiguration {
  onAppEnter?: (appConfig) => void;
  onAppLeave?: (appConfig) => void;
  onLoadingApp?: (appConfig) => void;
  onFinishLoading?: (appConfig) => void;
  reroute: (url, type: RouteType) => void;
  onRouteChange?: (
    url: string,
    pathname: string,
    query: object,
    hash?: string,
    type?: RouteType | 'init' | 'hashchange' | 'popstate',
  ) => void;
}

let lastUrl = null;
const globalConfiguration: GlobalConfiguration = {
  reroute: (url) => {
    if (lastUrl !== url) {
      const { pathname } = urlParse(url, true);

      const unmountApps: AppConfig[] = [];
      const activeApps: AppConfig[] = [];

      microApps.forEach((microApp) => {
        if (pathname === microApp.activePath) {
          activeApps.push(microApp);
        } else {
          unmountApps.push(microApp);
        }
      });

      activeApps.forEach((app) => {
        createMicroApp(app);
      });

      lastUrl = url;
    }
  },
  onRouteChange: (...args) => {
    console.log(args);
  },
};
interface OriginalStateFunction {
  (state: any, title: string, url?: string): void;
}
const originalPush: OriginalStateFunction = window.history.pushState;
const originalReplace: OriginalStateFunction = window.history.replaceState;

/**
 * Hijack window.history
 */
const hijackHistory = (): void => {
  window.history.pushState = (state: any, title: string, url: string, ...rest) => {
    originalPush.apply(window.history, [state, title, url, ...rest]);
    const eventName = 'pushState';
    handleStateChange(createPopStateEvent(state, eventName), url, eventName);
  };

  window.history.replaceState = (state: any, title: string, url: string, ...rest) => {
    originalReplace.apply(window.history, [state, title, url, ...rest]);
    const eventName = 'replaceState';
    handleStateChange(createPopStateEvent(state, eventName), url, eventName);
  };

  window.addEventListener('popstate', urlChange, false);
  window.addEventListener('hashchange', urlChange, false);
};

/**
 * Unhijack window.history
 */
export const unHijackHistory = (): void => {
  window.history.pushState = originalPush;
  window.history.replaceState = originalReplace;

  window.removeEventListener('popstate', urlChange, false);
  window.removeEventListener('hashchange', urlChange, false);
};

let historyEvent = null;

function setHistoryEvent(event) {
  historyEvent = event;
}

export function getHistoryEvent() {
  return historyEvent;
}

const handleStateChange = (event: PopStateEvent, url: string, method: RouteType) => {
  setHistoryEvent(event);
  globalConfiguration.reroute(url, method);
};

const urlChange = (event: PopStateEvent | HashChangeEvent): void => {
  setHistoryEvent(event);
  globalConfiguration.reroute(location.href, event.type as RouteType);
};

// GlobalConfiguration end

let start = false;
export const render = (options) => {
  if (start) return;
  start = true;
  hijackHistory();
  recordAssets();
  Object.keys(options || {}).forEach((configKey) => {
    globalConfiguration[configKey] = options?.[configKey];
  });
  window.addEventListener('popstate', urlChange, false);
};
