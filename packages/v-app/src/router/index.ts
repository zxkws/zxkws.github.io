import { createWebHistory, createRouter } from "vue-router";
import getBasename from "../utils/getBasename";
import Home from "../components/Home.vue";
import List from "../components/List.vue";
import Detail from "../components/Detail.vue";
import NotFound from "../components/404.vue";
import isInIcestark from "../utils/isInIcestark";
import renderNotFound from "../utils/renderNotFound";

const renderNotFoundPromise = () =>
  new Promise((resolve) => {
    renderNotFound();
    resolve(true);
  });

const routes = [
  {
    name: "todo",
    path: "/todo",
    component: () => import("../views/Todo/index.vue"),
  },
  {
    name: "login",
    path: "/login",
    component: () => import("../views/Login/index.vue"),
  },
  {
    name: "register",
    path: "/register",
    component: () => import("../views/Register/index.vue"),
  },
  {
    name: "overview",
    path: "/",
    component: Home,
  },
  {
    path: "/list",
    component: List,
  },
  {
    path: "/detail",
    component: Detail,
  },
  {
    path: "/siteProxy",
    component: () => import("../views/SiteProxy/index.vue"),
  },
  {
    path: "/:pathMatch(.*)",
    component: isInIcestark() ? () => renderNotFoundPromise() : NotFound,
  },
];

const history = createWebHistory(
  isInIcestark() ? getBasename() : "/sub-app/v3"
);
const router = createRouter({
  history,
  routes,
});

router.beforeEach((to, from, next) => {
  next();
});

export default router;
