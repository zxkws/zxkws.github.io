import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ["vue"],
      dts: "src/auto-imports.d.ts", // 自动生成的 TypeScript 声明文件路径
    }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "ZXKWS",
        short_name: "ZXKWS",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64 32x32 24x24 16x16",
            type: "image/x-icon"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
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
      "^/api": {
        target: "https://api.zxkws.nyc.mn",
        // "https://3000-zxkws-monorepoadmin-qgp9qaiie1l.ws-us116.gitpod.io",
        changeOrigin: true,
      },
    },
    allowedHosts: ["5173-zxkws-zxkwsgithubio-kv2ddskkt66.ws-us118.gitpod.io"],
  },
  resolve: {
    // extensions: [".vue", ".ts", ".js", ".jsx", "tsx", ".json"],
    alias: {
      "@": resolve("./src"),
    },
  },
});
