<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createFetchClient } from '@zxkws/shared-fetch';

const router = useRouter();
const route = useRoute();

const form = ref({ email: '', password: '' });
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);

const client = createFetchClient({
  baseURL: import.meta.env.MODE === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api',
  persistToken: (token) => localStorage.setItem('auth_token', token),
  onUnauthorized: () => {},
});

const redirectTo = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/v-app/navList';
  window.location.href = redirect;
};

const onSubmit = async () => {
  error.value = '';
  loading.value = true;
  try {
    await client<string>('/v1/user/login', form.value);
    redirectTo();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page">
    <div class="panel">
      <h1 class="title">登录</h1>
      <p class="subtitle">进入工作台</p>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="field">
        <label class="label">邮箱</label>
        <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" />
      </div>
      <div class="field">
        <label class="label">密码</label>
        <div class="input-wrap">
          <input
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="••••••••"
            autocomplete="current-password"
          />
          <button type="button" class="toggle-eye" @click="showPassword = !showPassword">
            {{ showPassword ? '🙈' : '👁' }}
          </button>
        </div>
      </div>
      <button class="btn" :disabled="loading" @click="onSubmit">{{ loading ? '登录中...' : '登录' }}</button>
      <div class="link-row">
        <span></span>
        <router-link class="link" to="/register" :query="route.query">去注册</router-link>
      </div>
    </div>
  </div>
</template>
