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
        redirect: '/navList',
      },
      {
        name: 'todo',
        path: '/todo',
        component: () => import('../views/Todo/index.vue'),
      },
      {
        name: 'navList',
        path: '/navList',
        component: () => import('../views/NavList/index.vue'),
      },
      {
        name: 'accountManagement',
        path: '/account',
        component: () => import('../views/AccountManagement/index.vue'),
      },
      {
        name: 'llmRanking',
        path: '/llm-ranking',
        component: () => import('../views/LlmRanking/index.vue'),
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
