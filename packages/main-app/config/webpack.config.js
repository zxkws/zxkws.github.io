const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

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
      // cdn: [
      //   `https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.${process.env.NODE_ENV}.min.js`,
      //   `https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.${process.env.NODE_ENV}.min.js`,
      //   `https://cdnjs.cloudflare.com/ajax/libs/react-router/6.26.2/react-router.${process.env.NODE_ENV}.min.js`,
      //   `https://cdnjs.cloudflare.com/ajax/libs/react-router-dom/6.26.2/react-router-dom.${process.env.NODE_ENV}.min.js`,
      // ],
    }),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: process.env.NODE_ENV,
        VITE_VAPID_PUBLIC_KEY: process.env.VITE_VAPID_PUBLIC_KEY,
      }),
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': resolve(__dirname, 'packages/main-app/src'),
    },
  },
  externals: {
    // react: 'React',
    // 'react/jsx-runtime': 'React',
    // 'react-dom': 'ReactDOM',
    // 'react-router': 'ReactRouter',
    // 'react-router-dom': 'ReactRouterDOM',
    // 'react-dom/client': 'ReactDOM',
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
    // webpack-dev-server@5 expects proxy to be an array; the old object shape triggers a schema error
    proxy: [
      {
        context: ['/api'],
        // 根据 SERVER_ENV 选择本地/线上后端，默认本地
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
