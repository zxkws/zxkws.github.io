import { createApp } from "vue";
import type { App as Root } from "vue";
import { createWebHistory, createRouter } from "vue-router";
import isInIcestark from "./utils/isInIcestark";
import getBasename from "./utils/getBasename";
import App from "./App.vue";
import routes from "./routes";
import { createPinia } from "pinia";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";
import "./style/tailwind.css";
import "./style/style.scss";

let vue: Root<Element> | null = null;

const runApp = (container: Element | string) => {
  const history = createWebHistory(
    isInIcestark() ? getBasename() : "/sub-app/v3"
  );
  const router = createRouter({
    history,
    routes,
  });
  vue = createApp(App);
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
