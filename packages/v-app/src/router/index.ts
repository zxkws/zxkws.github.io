import { createWebHistory, createRouter, type Router } from 'vue-router';
import NotFound from '../components/404.vue';

export const routes = [
  {
    name: 'overview',
    path: '/',
    component: () => import('@/components/Home.vue'),
    children: [
      {
        path: '/',
        redirect: '/text-difference',
      },
      {
        name: 'todo',
        path: '/todo',
        component: () => import('../views/Todo/index.vue'),
      },
      {
        name: 'textDifference',
        path: '/text-difference',
        component: () => import('../views/TextDifference/index.vue'),
      },
      {
        name: 'jsonViewer',
        path: '/json-viewer',
        component: () => import('../views/JsonViewer/index.vue'),
      },
      {
        name: 'payment',
        path: '/payment',
        component: () => import('../views/Payment/index.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)',
    component: NotFound,
  },
];

let currentRouter: Router | null = null;

export const createRouterInstance = (base?: string) => {
  currentRouter = createRouter({
    history: createWebHistory(base ?? import.meta.env.BASE_URL),
    routes,
  });
  return currentRouter;
};

export const getRouter = () => currentRouter;

export default createRouterInstance;
