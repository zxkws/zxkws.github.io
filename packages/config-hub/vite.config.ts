import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react()],
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
    },
    base: isProd ? '/config-hub/' : '/',
  };
});
