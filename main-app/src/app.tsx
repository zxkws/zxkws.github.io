import { runApp, IAppConfig } from 'ice';
import { ConfigProvider } from '@alifd/next';
import PageLoading from '@/components/PageLoading';
import FrameworkLayout from '@/layouts/FrameworkLayout';
import { AuthProvider } from './context/AuthContext';

const appConfig: IAppConfig = {
  app: {
    rootId: 'icestark-container',
    addProvider: ({ children }) => (
      <ConfigProvider prefix="next-icestark-"><AuthProvider>{children}</AuthProvider></ConfigProvider>
    ),
  },
  router: {
    type: 'browser',
  },
  icestark: {
    Layout: FrameworkLayout,
    getApps: async () => {
      const apps = [{
        path: '/v3',
        title: 'vue子应用',
        loadScriptMode: 'import',
        entry: 'https://abc.look.cloudns.biz/sub-app/v3/index.html',
      },
      {
        path: '/rc',
        title: 'react子应用',
        loadScriptMode: 'import',
        entry: 'https://abc.look.cloudns.biz/sub-app/rc/index.html',
      },
        {
        path: '/seller',
        title: '商家平台',
        loadScriptMode: 'import',
        // React app demo: https://github.com/ice-lab/react-materials/tree/master/scaffolds/icestark-child
        entry: 'http://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-seller-ice-vite/index.html',
      }, {
        path: '/waiter',
        title: '小二平台',
        loadScriptMode: 'import',
        entry: 'http://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-vue3-vite/index.html',
      }, {
        path: '/angular',
        title: 'Angular',
        sandbox: true,
        // Angular app demo: https://github.com/ice-lab/icestark-child-apps/tree/master/child-common-angular
        entry: 'https://iceworks.oss-cn-hangzhou.aliyuncs.com/icestark/child-common-angular/index.html',
      }];
      return apps;
    },
    appRouter: {
      LoadingComponent: PageLoading,
    },
  },
};

runApp(appConfig);
