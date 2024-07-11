import { defineConfig } from '@ice/app';

export default defineConfig(() => ({
  publicPath: '/sub-app/rc',
  router: {
    basename: '/sub-app/rc',
  },
}));