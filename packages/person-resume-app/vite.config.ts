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
    base: isProd ? '/person-resume-app/' : '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5181,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
    },
    css: {
      devSourcemap: !isProd,
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
  };
});
