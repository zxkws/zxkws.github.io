import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import htmlPlugin from 'vite-plugin-index-html';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const serverEnv = process.env.SERVER_ENV === 'prod' ? 'prod' : 'dev';
  const apiProxyTarget =
    process.env.API_PROXY_TARGET ||
    process.env.API_BASE_URL ||
    (serverEnv === 'prod' ? '' : 'http://localhost:3333');
  return {
    envPrefix: ['VITE_', 'API_BASE_URL'],
    plugins: [
      vue(),
      htmlPlugin({
        input: './src/main.ts',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5183,
      proxy: {
        '^/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          cookiePathRewrite: '/',
        },
      },
    },
    base: isProd ? '/auth-app/' : '/',
    build: {
      sourcemap: !isProd,
      outDir: 'dist',
      rollupOptions: {
        output: {
          entryFileNames: 'entry.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
