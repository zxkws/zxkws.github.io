const { resolve } = require('path');
const { execSync } = require('child_process');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const WorkboxPlugin = require('workbox-webpack-plugin');
const { SimpleCopyPlugin } = require('../../build-tools'); // 引入我们自己写的插件
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// 运行时后端目标：默认走本地开发服务，必要时可以通过 SERVER_ENV=prod 切换到线上网关
const SERVER_ENV = process.env.SERVER_ENV === 'prod' ? 'prod' : 'dev';
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET || process.env.API_BASE_URL || (SERVER_ENV === 'prod' ? '' : 'http://localhost:3333');

const isProd = process.env.NODE_ENV === 'production';
const safeExec = (cmd) => {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};

const BUILD_VERSION = safeExec('git log -1 --format=%cI');
const BUILD_TIME = new Date().toISOString();

module.exports = {
  // 开启生产环境 source map，便于线上错误定位；如需隐藏源码可改为 'hidden-source-map'
  devtool: isProd ? 'source-map' : 'inline-source-map',
  entry: './src/app',
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          isProd ? MiniCssExtractPlugin.loader : 'style-loader',
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
    process.env.ANALYZE && new BundleAnalyzerPlugin(),
    isProd &&
      new MiniCssExtractPlugin({
        filename: 'css/[name].[contenthash:8].css',
        chunkFilename: 'css/[name].[contenthash:8].chunk.css',
      }),
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
        BUILD_VERSION: BUILD_VERSION || 'unknown',
        BUILD_TIME,
      }),
    }),
    // PWA Service Worker Configuration
    isProd &&
      new WorkboxPlugin.GenerateSW({
        // Workbox 默认会在 production mode 下对 SW 做 terser 压缩；
        // 当前环境会触发 “Unexpected early exit (terser renderChunk)”。
        // 先用 development mode 生成未压缩的 SW，保证构建可用。
        mode: 'development',
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
              // 不设置 networkTimeout：避免网络慢时回退到旧 index.html（导致“刷新还看到旧版本”）
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60, // 1 Day
              },
            },
          },
          // 1. 带 hash 的静态资源：CacheFirst（hash 变更即 URL 变更，天然 cache-bust），避免 NetworkFirst timeout 带来的额外等待
          {
            urlPattern: ({ url }) => {
              if (url.origin !== self.location.origin) return false;
              return url.pathname.match(/\.(js|mjs|css)$/) && /[.-][0-9a-f]{8}\./i.test(url.pathname);
            },
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-static-hashed-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
              },
            },
          },
          // 2. 非 hash 的 JS/CSS（例如微应用 entry.js）：NetworkFirst，避免发布后需要多次刷新才能生效
          {
            urlPattern: ({ url }) => {
              if (url.origin !== self.location.origin) return false;
              return url.pathname.match(/\.(js|mjs|css)$/) && !/[.-][0-9a-f]{8}\./i.test(url.pathname);
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-static-nonhashed-assets',
              // 不设置 networkTimeout：避免发布后因网络慢而继续使用旧 entry（导致“更新不生效”）
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
  optimization: isProd
    ? {
        splitChunks: {
          chunks: 'all',
        },
        runtimeChunk: 'single',
      }
    : undefined,
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
      {
        // Watch Together 使用 socket.io：前端 dev server 需要把 /socket.io 代理到后端
        // 才能在本地开发时通过同源脚本地址加载 socket.io 客户端并建立 WS 连接。
        context: ['/socket.io'],
        target: API_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        ws: true,
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
