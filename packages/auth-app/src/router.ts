import { createRouter, createWebHashHistory } from 'vue-router';
import Login from './views/Login.vue';
import Register from './views/Register.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL || '/auth-app/'),
  routes,
});

export default router;
