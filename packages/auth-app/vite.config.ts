import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import htmlPlugin from 'vite-plugin-index-html';

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
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5183,
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
