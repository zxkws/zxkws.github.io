// import { runApp, IAppConfig } from 'ice';
import PageLoading from '@/components/PageLoading';
// import FrameworkLayout from '@/layouts/FrameworkLayout';
import { AuthProvider } from './context/AuthContext';

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

import { AppRouter, AppRoute } from '@ice/stark';
import BasicLayout from '@/layouts/BasicLayout';
import ReactDom from 'react-dom/client';

// https://github.com/ice-lab/icestark

function App1() {
  return (
    <AuthProvider>
      <BasicLayout>
        {/* @ts-ignore */}
        <AppRouter LoadingComponent={<PageLoading />}>
          <AppRoute
            activePath="/baidu"
            render={() => {
              return <iframe src="https://www.baidu.com" />;
            }}
            // 或者直接传入 component
            // component={PageLoading}
          />
          <AppRoute
            activePath="/"
            loadScriptMode="import"
            title="商家平台"
            entry="https://zxkws.nyc.mn/sub-app/rc/index.html"
            // url={[
            //   '//unpkg.com/icestark-child-seller/build/js/index.js',
            //   '//unpkg.com/icestark-child-seller/build/css/index.css',
            // ]}
          />
        </AppRouter>
      </BasicLayout>
    </AuthProvider>
  );
}

function render(runtime, options) {
  const { mountNode, rootId } = options.appConfig || {};
  const App = getRenderApp(runtime, options);
  ReactDom.createRoot(getAppMountNode(mountNode, rootId)).render(<App />);
}

function getAppMountNode(mountNode, rootId) {
  return mountNode || document.getElementById(rootId) || document.getElementById('icestark-container');
}

function getRenderApp(runtime, options) {
  return App1;
}

render({}, {});
