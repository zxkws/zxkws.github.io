import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
  css: {
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
      scss: {
        charset: false,
        // additionalData: `@import "./src/style/global.scss";`,
      },
    },
  },
  server: {
    proxy: {
      '^/api': {
        target: 'https://api.zxkws.nyc.mn',
        changeOrigin: true,
      },
    },
    allowedHosts: ['.gitpod.io'],
  },
  resolve: {
    alias: {
      '@': resolve('./src'),
    },
  },
  base: process.env.NODE_ENV === 'production' ? '/v-app/' : '/',
  build: {
    sourcemap: false,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
});
