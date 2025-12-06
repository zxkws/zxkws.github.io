import { createApp } from 'vue';

import App from './App.vue';
import './styles.css';

const container = document.getElementById('app');

if (!container) {
  throw new Error('vue: app container not found');
}

createApp(App).mount(container);
