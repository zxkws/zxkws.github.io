import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import AutoImport from "unplugin-auto-import/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx({
      // 可以在这里添加其他 JSX 相关配置
      // 比如: transformOn: true, optimize: true 等
    }),
    AutoImport({
      imports: ["vue"],
      dts: "src/auto-imports.d.ts", // 自动生成的 TypeScript 声明文件路径
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
