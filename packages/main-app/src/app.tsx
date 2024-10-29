// import { runApp, IAppConfig } from 'ice';
import PageLoading from '@/components/PageLoading';
// import FrameworkLayout from '@/layouts/FrameworkLayout';
import { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import './global.scss';
import urlParse from 'url-parse';
import * as pathToRegexp from 'path-to-regexp';

// const appConfig: IAppConfig = {
//   app: {
//     rootId: 'icestark-container',
//     addProvider: ({ children }) => (
//         <AuthProvider>{children}</AuthProvider>
//     ),
//   },
//   router: {
//     type: 'browser',
//   },
//   icestark: {
//     Layout: FrameworkLayout,
//     getApps: async () => {
//       const apps = [
//         {
//           path: '/v3',
//           title: 'vue子应用',
//           loadScriptMode: 'import',
//           entry: 'https://zxkws.nyc.mn/sub-app/v3/index.html',
//         },
//         {
//           path: '/rc',
//           title: 'react子应用',
//           loadScriptMode: 'import',
//           entry: 'https://zxkws.nyc.mn/sub-app/rc/index.html',
//         },
// {
//   path: '/seller',
//   title: '商家平台',
//   loadScriptMode: 'import',
//   // React app demo: https://github.com/ice-lab/react-materials/tree/master/scaffolds/icestark-child
//   entry: 'http://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-seller-ice-vite/index.html',
// },
// {
//   path: '/waiter',
//   title: '小二平台',
//   loadScriptMode: 'import',
//   entry: 'http://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-vue3-vite/index.html',
// },
// {
//   path: '/angular',
//   title: 'Angular',
//   sandbox: true,
//   // Angular app demo: https://github.com/ice-lab/icestark-child-apps/tree/master/child-common-angular
//   entry: 'https://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-common-angular/index.html',
// },
//       ];
//       return apps;
//     },
//   },
// };

// runApp(appConfig);

// import { AppRouter, AppRoute } from '@ice/stark';
import BasicLayout from '@/layouts/BasicLayout';
import ReactDom from 'react-dom/client';
import { RouterType } from './layouts/BasicLayout/components/PageNav';

const apps: AppConfig[] = [
  {
    name: 'curlconverter',
    activePath: '/curlconverter',
    title: 'curlconverter',
    render: () => <iframe loading="lazy" src="https://curlconverter.com/" />,
  },
];

declare global {
  interface Window {
    microApps?: any[];
  }
}

type ActivePath = string;

type ActivePathFn = (url) => boolean;

type PathData = {
  value: string;
  exact?: boolean;
};

function matchPath(href, options: PathData) {
  const { value, exact } = options;
  const { pathname } = urlParse(href, true);
  const regExpOptions = {
    strict: true,
    sensitive: true,
    end: exact,
  };
  const regexp = pathToRegexp.pathToRegexp(value, regExpOptions);
  console.log(regexp);
  return value === pathname;
}

const findActivePath = (activePath?: PathData[] | ActivePathFn): ((url?: string) => string | boolean) => {
  if (!activePath) {
    return () => true;
  }

  if (typeof activePath === 'function') {
    return activePath;
  }

  return (url) => {
    const isActive = activePath.some((path) => matchPath(url, path));
    return isActive;
  };
};

type FindActivePathReturn = ReturnType<typeof findActivePath>;

interface BaseConfig {
  name?: string;
  url?: string | string[];
  status?: 'not_loaded' | 'mounted';
  basename?: string;
  activePath?: ActivePath;
  findActivePath?: FindActivePathReturn;
  title?: string;
  render: any;
}

interface LifeCycleProps {
  customProps: object;
}

interface ModuleLifeCycle {
  mount?: (props: LifeCycleProps) => Promise<void> | void;
}

interface AppConfig extends BaseConfig {
  appLifeCycle?: AppLifeCycleOptions;
}

interface MicroApp extends AppConfig, ModuleLifeCycle {
  configuration?: StartConfiguration;
}

let microApps: MicroApp[] = [];
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
  return microApps.map((app) => app.name);
}

export function getMicroApps() {
  return microApps;
}

export function getAppStatus(appName: string) {
  const app = microApps.find((microApp) => appName === microApp.name);
  return app ? app.status : '';
}

interface AppLifeCycleOptions {
  beforeMount?: () => void;
}

function registerMicroApp(appConfig: AppConfig, appLifeCycle?: AppLifeCycleOptions) {
  if (getAllAppNames().includes(appConfig.name)) {
    throw new Error(`[${appConfig.name}] has registered`);
  }

  microApps.push({
    status: 'not_loaded',
    ...appConfig,
    findActivePath: findActivePath as any,
    appLifeCycle,
  });
}

function registerMicroApps(appConfigs: AppConfig[] = [], applifeCycle?: AppLifeCycleOptions) {
  appConfigs.forEach((appConfig) => {
    registerMicroApp(appConfig, applifeCycle);
  });
}

registerMicroApps(apps);

const urlChange = (event) => {
  console.log(event, 1111);
};

function App({ children }) {
  useEffect(() => {
    window.addEventListener('popstate', urlChange, false);
    window.addEventListener('hashchange', urlChange, false);
  }, []);

  return (
    <AuthProvider>
      <BasicLayout>
        <PageLoading>{children}</PageLoading>

        {/* @ts-ignore */}
        {/* <AppRouter LoadingComponent={<PageLoading />}> */}
        {/* <AppRoute
            activePath="/baidu"
            render={() => {
              return <iframe src="https://www.baidu.com" />;
            }}
            // 或者直接传入 component
            // component={PageLoading}
          /> */}
        {/* <AppRoute
            activePath="/"
            loadScriptMode="import"
            title="商家平台"
            entry="https://zxkws.nyc.mn/sub-app/rc/index.html"
            // url={[
            //   '//unpkg.com/icestark-child-seller/build/js/index.js',
            //   '//unpkg.com/icestark-child-seller/build/css/index.css',
            // ]}
          /> */}
        {/* </AppRouter> */}
      </BasicLayout>
    </AuthProvider>
  );
}

export interface StartConfiguration {
  onAppEnter?: (appConfig) => void;
  onAppLeave?: (appConfig) => void;
  onLoadingApp?: (appConfig) => void;
  onFinishLoading?: (appConfig) => void;
  reroute?: (url, type) => void;
  onRouteChange?: (
    url: string,
    pathname: string,
    query: object,
    hash?: string,
    type?: RouterType | 'init' | 'hashchange' | 'popstate',
  ) => void;
}

export const globalConfiguration: StartConfiguration = {
  onAppEnter: (...args) => {
    console.log(args);
  },
  onAppLeave: (...args) => {
    console.log(args);
  },
  onLoadingApp: (...args) => {
    console.log(args);
  },
  onFinishLoading: (...args) => {
    console.log(args);
  },
  reroute: (...args) => {
    console.log(args);
  },
  onRouteChange: (...args) => {
    console.log(args);
  },
};

type StaticNodeList = Array<HTMLLinkElement | HTMLScriptElement | HTMLStyleElement>;

function getAssetsNode(): StaticNodeList {
  let nodeList: StaticNodeList = [];
  ['link', 'script', 'style'].forEach((tag) => {
    nodeList = [...nodeList, ...Array.from(document.getElementsByTagName(tag))] as StaticNodeList;
  });

  return nodeList;
}

const PREFIX = 'icestark';
const STATIC = 'static';
const DYNAMIC = 'dynamic';

function recordAssets() {
  const assetsList = getAssetsNode();
  assetsList.forEach((node) => {
    if (node.getAttribute(PREFIX) !== DYNAMIC) {
      node.setAttribute(PREFIX, STATIC);
    }
  });
}

function loadApp(appConfig) {
  const { title } = appConfig;
  if (title) {
    document.title = title;
  }
}

function createMicroApp(
  app: string | AppConfig,
  appLifeCycle?: AppLifeCycleOptions,
  configuration?: StartConfiguration,
) {
  const appName = typeof app === 'string' ? app : app.name;
  console.log(appName);
  loadApp(app);
}

let lastUrl = null;
function reroute(url, type) {
  const { pathname, query, hash } = urlParse(url, true);
  if (lastUrl !== url) {
    globalConfiguration.onRouteChange!(url, pathname, query, hash, type);
    const unmountApps: AppConfig[] = [];
    const activeApps: AppConfig[] = [];

    microApps.forEach((microApp) => {
      const shouldBeActive = !!microApp.findActivePath!(url);
      if (shouldBeActive) {
        activeApps.push(microApp);
      } else {
        unmountApps.push(microApp);
      }
    });
    // 先卸载
    //
    activeApps.map((app) => createMicroApp(app));
    lastUrl = url;
  }
}

let start = false;

function render(options?: StartConfiguration) {
  if (start) {
    return;
  }

  start = true;

  recordAssets();

  globalConfiguration.reroute = reroute;

  Object.keys(options || {}).forEach((configKey) => {
    globalConfiguration[configKey] = options?.[configKey];
  });

  const renderProps = getRenderApp() || null;
  ReactDom.createRoot(document.getElementById('main-app-container')!).render(<App>{renderProps && renderProps()}</App>);
}

function getRenderApp() {
  const target = apps.find((item) => item.activePath === location.pathname);
  return target?.render;
}

render({
  onAppEnter: () => {},
  onAppLeave: () => {},
  onLoadingApp: () => {},
  onFinishLoading: () => {},
});
