import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import htmlPlugin from 'vite-plugin-index-html';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  // Vue 学习项目同样使用源码/开发态依赖，便于调试和阅读
  const useSourceBundle = true;

  return {
    plugins: [
      vue(),
      htmlPlugin({
        input: './src/main.ts',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    base: isProd ? '/vue/' : '/',
    define: useSourceBundle
      ? {
          'process.env.NODE_ENV': JSON.stringify('development'),
          __DEV__: JSON.stringify(true),
          __VUE_OPTIONS_API__: JSON.stringify(true),
          __VUE_PROD_DEVTOOLS__: JSON.stringify(true),
        }
      : {},
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: useSourceBundle
      ? {
          esbuildOptions: {
            define: {
              'process.env.NODE_ENV': '"development"',
            },
          },
        }
      : undefined,
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
      ...(useSourceBundle
        ? {
            define: {
              'process.env.NODE_ENV': '"development"',
            },
          }
        : {}),
    },
    build: {
      sourcemap: true,
      // 暴露源码结构，方便线上学习与断点调试
      minify: useSourceBundle ? false : 'esbuild',
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
