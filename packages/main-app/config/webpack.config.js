const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const WorkboxPlugin = require('workbox-webpack-plugin');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// 运行时后端目标：默认走本地开发服务，必要时可以通过 SERVER_ENV=prod 切换到线上网关
const SERVER_ENV = process.env.SERVER_ENV === 'prod' ? 'prod' : 'dev';
const API_PROXY_TARGET = SERVER_ENV === 'prod' ? 'https://system.zxkws.nyc.mn' : 'http://localhost:3333';

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  // 开启生产环境 source map，便于线上错误定位；如需隐藏源码可改为 'hidden-source-map'
  devtool: isProd ? 'source-map' : 'inline-source-map',
  entry: './src/app',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader', // 处理 CSS 文件
            options: {
              esModule: true,
              modules: {
                namedExport: true,
                auto: true, // 启用 CSS Modules，auto 会针对 .module.css 文件启用
                localIdentName: '[path][name]__[local]--[hash:base64:5]',
              },
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: true,
      minify: isProd,
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV,
        VITE_VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY,
      }),
    }),
    // PWA Service Worker Configuration
    isProd &&
      new WorkboxPlugin.GenerateSW({
        // 这些选项帮助快速启用 ServiceWorkers
        // 不允许遗留的 SW 控制页面
        clientsClaim: true,
        skipWaiting: true,

        // 预缓存过滤
        exclude: [/\.map$/, /asset-manifest\.json$/],

        // 运行时缓存策略 (Runtime Caching)
        runtimeCaching: [
          // 1. 缓存子应用的资源 (JS/CSS)
          {
            // 匹配子应用路径，例如 /v-react/assets/xxx.js 或 localhost:5185/xxx.js
            urlPattern: ({ url }) => {
              return url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif)$/);
            },
            handler: 'StaleWhileRevalidate', // 策略：优先用旧的，后台更新
            options: {
              cacheName: 'sub-apps-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
              },
            },
          },
          // 2. 缓存图片 CDN
          {
            urlPattern: ({ url }) =>
              url.origin.includes('images.unsplash.com') || url.origin.includes('api.dicebear.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-images',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
          // 3. API 请求网络优先 (NetworkFirst)，这里主要是为了防误伤，其实默认 fetch 不会被 SW 拦截除非配了
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
            },
          },
        ],
      }),
  ].filter(Boolean),
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': resolve(__dirname, 'packages/main-app/src'),
    },
  },
  devServer: {
    port: 3000,
    historyApiFallback: true,
    hot: true,
    open: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    static: {
      directory: resolve(__dirname, '../public'),
      publicPath: '/',
    },
    proxy: [
      {
        context: ['/api'],
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: 'localhost',
        cookiePathRewrite: '/',
      },
    ],
  },
  output: {
    path: resolve(__dirname, '../dist'),
    publicPath: isProd ? '/' : '/',
    filename: isProd ? 'js/[name].[contenthash:8].js' : 'js/[name].js',
    chunkFilename: isProd ? 'js/[name].[contenthash:8].chunk.js' : 'js/[name].chunk.js',
    assetModuleFilename: 'assets/[name].[hash][ext]',
    clean: true,
  },
};
