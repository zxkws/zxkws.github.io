import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import htmlPlugin from 'vite-plugin-index-html';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  // 学习项目默认使用源码/开发态依赖，方便在线阅读和调试
  const useSourceBundle = true;

  return {
    plugins: [
      react(),
      htmlPlugin({
        input: './src/main.tsx',
        preserveEntrySignatures: 'exports-only',
      }),
    ],
    base: isProd ? '/react/' : '/',
    define: useSourceBundle
      ? {
          'process.env.NODE_ENV': JSON.stringify('development'),
          __DEV__: JSON.stringify(true),
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
      // 输出不再压缩，直接暴露源码结构
      minify: useSourceBundle ? false : 'esbuild',
      outDir: 'dist',
      target: 'esnext',
      rollupOptions: {
        external: ['react', 'react-dom/client'],
        preserveEntrySignatures: 'exports-only',
        output: {
          globals: {
            react: 'React',
            'react-dom/client': 'ReactDOM',
          },
          entryFileNames: 'entry.js',
          chunkFileNames: 'chunks/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
