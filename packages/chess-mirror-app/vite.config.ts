import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import htmlPlugin from 'vite-plugin-index-html';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    envPrefix: ['VITE_', 'API_BASE_URL'],
    plugins: [
      react(),
      htmlPlugin({
        input: './src/main.tsx',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    base: isProd ? '/chess-mirror-app/' : '/',
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5186,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      proxy: {
        '/api': 'http://127.0.0.1:3333',
      },
    },
    build: {
      outDir: 'dist',
      target: 'esnext',
      rollupOptions: {
        // Removed external: ['react', ...] to bundle dependencies, matching v-react pattern.
        // This prevents 404s on the 'react' module at runtime.
        output: {
          entryFileNames: 'entry.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
