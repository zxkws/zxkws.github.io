<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { createFetchClient } from '@zxkws/shared-fetch';

const route = useRoute();
const form = ref({ username: '', email: '', password: '' });
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);

const client = createFetchClient({
  baseURL: import.meta.env.MODE === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api',
  persistToken: (token) => localStorage.setItem('auth_token', token),
});

const redirectTo = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/v-app/navList';
  window.location.href = redirect;
};

const onSubmit = async () => {
  error.value = '';
  loading.value = true;
  try {
    await client<string>('/v1/user/register', form.value);
    redirectTo();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注册失败';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page">
    <div class="panel">
      <h1 class="title">注册</h1>
      <p class="subtitle">创建账号后自动登录</p>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="field">
        <label class="label">用户名</label>
        <input v-model="form.username" type="text" placeholder="your name" autocomplete="username" />
      </div>
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
            autocomplete="new-password"
          />
          <button type="button" class="toggle-eye" @click="showPassword = !showPassword">
            {{ showPassword ? '🙈' : '👁' }}
          </button>
        </div>
      </div>
      <button class="btn" :disabled="loading" @click="onSubmit">{{ loading ? '注册中...' : '注册并登录' }}</button>
      <div class="link-row">
        <router-link class="link" to="/login" :query="route.query">返回登录</router-link>
        <span></span>
      </div>
    </div>
  </div>
</template>
