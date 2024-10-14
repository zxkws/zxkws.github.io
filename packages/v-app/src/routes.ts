import Home from "./components/Home.vue";
import List from "./components/List.vue";
import Detail from "./components/Detail.vue";
import NotFound from "./components/404.vue";
import isInIcestark from "./utils/isInIcestark";
import renderNotFound from "./utils/renderNotFound";

const renderNotFoundPromise = () =>
  new Promise((resolve) => {
    renderNotFound();
    resolve(true);
  });

const routes = [
  {
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
    component: () => import("./views/SiteProxy/index.vue"),
  },
  {
    path: "/:pathMatch(.*)",
    component: isInIcestark() ? () => renderNotFoundPromise() : NotFound,
  },
];

export default routes;
