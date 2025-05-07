import { createWebHistory, createRouter } from "vue-router";
import NotFound from "../components/404.vue";

const routes = [
  {
    name: "overview",
    path: "/",
    component: () => import("@/components/Home.vue"),
    children: [
      {
        path: "/",
        redirect: "/navList",
      },
      {
        name: "todo",
        path: "/todo",
        component: () => import("../views/Todo/index.vue"),
      },
      {
        path: "/navList",
        component: () => import("../views/NavList/index.vue"),
      },
    ],
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
    path: "/:pathMatch(.*)",
    component: NotFound,
  },
];

const history = createWebHistory();
const router = createRouter({
  history,
  routes,
});

router.beforeEach((to, from, next) => {
  next();
});

export default router;
