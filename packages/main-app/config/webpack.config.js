const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  devtool: isProd ? false : 'cheap-module-source-map',
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
                localIdentName: "[path][name]__[local]--[hash:base64:5]",
              },
            },
          },
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
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': resolve(__dirname, '../src'),
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
};
