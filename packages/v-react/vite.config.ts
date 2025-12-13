import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import htmlPlugin from 'vite-plugin-index-html';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  const serverEnv = process.env.SERVER_ENV === 'prod' ? 'prod' : 'dev';
  const apiProxyTarget =
    serverEnv === 'prod' ? 'https://system.zxkws.nyc.mn' : 'http://localhost:3333';

  return {
    envPrefix: ['VITE_', 'API_BASE_URL'],
    plugins: [
      react(),
      htmlPlugin({
        input: './src/main.tsx',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5185,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, content-type, Authorization',
      },
      proxy: {
        '^/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    css: {
      devSourcemap: !isProd,
    },
    base: isProd ? '/v-react/' : '/',
    build: {
      sourcemap: !isProd,
      outDir: 'dist',
      rollupOptions: {
        output: {
          entryFileNames: 'entry.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
