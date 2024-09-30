export default {
  vite: {
    build: {
      rollupOptions: {
        external: ['react', 'react-dom', 'react-dom/client', 'react-router', 'react-router-dom'],
      },
    },
    resolve: {
      // alias: {
      //   react: 'globalThis.React',
      //   'react-dom': 'globalThis.ReactDOM',
      //   'react-dom/client': 'globalThis.ReactDOM',
      //   'react-router': 'globalThis.ReactRouter',
      //   'react-router-dom': 'globalThis.ReactRouterDOM',
      // },
    },
  },
  hash: true,
  outputAssetsPath: {
    js: 'js',
    css: 'css',
  },
  publicPath: '/',
  plugins: [
    [
      'build-plugin-icestark',
      {
        type: 'framework',
      },
    ],
  ],
  modeConfig: {
    development: {},
    production: {},
  },
  polyfill: false,
  externals: {
    react: 'React',
    'react-dom': 'ReactDOM',
    'react-router': 'ReactRouter',
    'react-router-dom': 'ReactRouterDOM',
    'react-dom/client': 'ReactDOM',
  },
};
