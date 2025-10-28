import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import htmlPlugin from 'vite-plugin-index-html';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      vue(),
      htmlPlugin({
        input: './src/main.ts',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    base: isProd ? '/vue-learning-app/' : '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5178,
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
        output: {
          entryFileNames: 'entry.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
