import { createApp } from "vue";
import type { App as Root } from "vue";
import "@surely-vue/table/dist/index.less";
import STable, { setLicenseKey } from "@surely-vue/table";

import isInIcestark from "./utils/isInIcestark";

import App from "./App.vue";

import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import "./style/tailwind.css";
import "./style/style.scss";
import router from "./router";

let vue: Root<Element> | null = null;

const runApp = (container: Element | string) => {
  vue = createApp(App);
  setLicenseKey(
    "0b50c5c2999298c91d183c696087eb90T1JERVI6MDAwMDEsRVhQSVJZPTQxMDIzNTg0MDAwMDAsRE9NQUlOPV8sS0VZVkVSU0lPTj0xLFVMVElNQVRFPTE="
  );

  vue.use(STable);
  const pinia = createPinia();
  pinia.use(piniaPluginPersistedstate);
  vue.use(pinia);
  vue.use(router);
  vue.mount(container);
};

if (!isInIcestark()) {
  runApp("#app");
}

export function mount({ container }: { container: Element }) {
  runApp(container);
}

export function unmount() {
  if (vue) {
    vue.unmount();
  }
}
