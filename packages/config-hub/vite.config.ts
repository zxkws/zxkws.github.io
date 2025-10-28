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
    server: {
      port: 5176,
      open: false,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    esbuild: {
      sourcemap: !isProd,
    },
    build: {
      sourcemap: !isProd,
      outDir: 'dist',
      rollupOptions: {
        preserveEntrySignatures: 'exports-only',
        output: {
          entryFileNames: 'entry.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
    base: isProd ? '/config-hub/' : '/',
  };
});
