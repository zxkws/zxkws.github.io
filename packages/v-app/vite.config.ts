import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import htmlPlugin from 'vite-plugin-index-html';
import AutoImport from 'unplugin-auto-import/vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [
      vue(),
      AutoImport({
        imports: ['vue'],
        dts: 'src/auto-imports.d.ts',
      }),
      htmlPlugin({
        input: './src/main.ts',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    css: {
      devSourcemap: !isProd,
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
        },
      },
    },
    esbuild: {
      sourcemap: !isProd,
    },
    server: {
      port: 5173,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
      proxy: {
        '^/api': {
          target: 'https://system.zxkws.nyc.mn',
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: 'localhost',
          cookiePathRewrite: '/',
        },
      },
      allowedHosts: ['.gitpod.io'],
    },
    resolve: {
      alias: {
        '@': resolve('./src'),
      },
    },
    base: isProd ? '/v-app/' : '/',
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
