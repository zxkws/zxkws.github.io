const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const WorkboxPlugin = require('workbox-webpack-plugin');
const { SimpleCopyPlugin } = require('../../packages/build-tools'); // 引入我们自己写的插件

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
    // 使用我们自己写的 SimpleCopyPlugin 来复制 public 目录下的静态文件
    // 这样 PWA 的 manifest.json, favicon.ico 等文件才能被复制到 dist 目录
    new SimpleCopyPlugin({
      from: resolve(__dirname, '../public'), // 源目录是当前项目的 public 文件夹
      to: '', // 目标目录为空，表示直接复制到 output.path 根目录
      ignore: ['index.html'], // 忽略 index.html，因为它由 HtmlWebpackPlugin 处理
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV,
        VITE_VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY,
        IS_DESKTOP: process.env.IS_DESKTOP,
        API_BASE_URL: process.env.API_BASE_URL,
      }),
    }),
    // PWA Service Worker Configuration
    isProd &&
      new WorkboxPlugin.GenerateSW({
        // 这些选项帮助快速启用 ServiceWorkers
        // 不允许遗留的 SW 控制页面
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,

        // 预缓存过滤
        // index.html 不预缓存：保证刷新时优先走网络拿到最新构建（避免“刷新还看到旧版本”）
        exclude: [/\.map$/, /asset-manifest\.json$/, /index\.html$/],

        // 运行时缓存策略 (Runtime Caching)
        runtimeCaching: [
          // 0. HTML/导航请求：NetworkFirst，确保刷新优先拿最新的 index.html（同时可作为离线兜底）
          {
            urlPattern: ({ request, url }) => url.origin === self.location.origin && request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-pages',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 Day
              },
            },
          },
          // 1. 静态资源（尤其是微应用的 entry.js / 非 hash 资源）用 NetworkFirst，避免发布后需要多次刷新才能生效
          {
            urlPattern: ({ url }) => {
              // 仅缓存同源资源；跨域资源交给浏览器自身缓存策略
              if (url.origin !== self.location.origin) return false;
              return url.pathname.match(/\.(js|mjs|css)$/);
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-static-assets',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
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
          // 3. API 请求网络优先 (NetworkOnly)，这里主要是为了防误伤，其实默认 fetch 不会被 SW 拦截除非配了
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly', // Changed from 'NetworkFirst' to 'NetworkOnly'
            options: {
              cacheName: 'api-cache',
              // networkTimeoutSeconds: 3, // NetworkOnly doesn't need networkTimeoutSeconds
              // expiration: { // NetworkOnly doesn't cache, so expiration is not needed
              //   maxEntries: 50,
              //   maxAgeSeconds: 5 * 60, // 5 minutes
              // },
            },
          },
        ],
      }),
  ].filter(Boolean),
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': resolve(__dirname, '../src'),
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
