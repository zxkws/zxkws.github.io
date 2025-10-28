import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import htmlPlugin from 'vite-plugin-index-html';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      react(),
      htmlPlugin({
        input: './src/main.tsx',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    base: isProd ? '/react-learning-app/' : '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5179,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },
    css: {
      devSourcemap: true,
    },
    esbuild: {
      sourcemap: true,
    },
    build: {
      sourcemap: true,
      outDir: 'dist',
      target: 'esnext',
      rollupOptions: {
        preserveEntrySignatures: 'exports-only',
      },
    },
  };
});
