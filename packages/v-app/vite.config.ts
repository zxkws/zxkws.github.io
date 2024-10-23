import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import htmlPlugin from "vite-plugin-index-html";
import AutoImport from "unplugin-auto-import/vite";
const isProd = process.env.NODE_ENV === "production";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    htmlPlugin({
      input: isProd ? "./src/main.ts" : "/src/main.ts",
      preserveEntrySignatures: "exports-only",
    }),
    AutoImport({
      imports: ["vue"],
      dts: "src/auto-imports.d.ts", // 自动生成的 TypeScript 声明文件路径
    }),
  ],
  base: process.env.VITE_BASE_URL,
  css: {
    preprocessorOptions: {
      scss: {
        charset: false,
        // additionalData: `@import "./src/style/global.scss";`,
      },
    },
  },
  server: {
    proxy: {
      "^/api": {
        target:
          "https://3000-zxkws-monorepoadmin-qgp9qaiie1l.ws-us116.gitpod.io",
        changeOrigin: true,
      },
    },
  },
});
