<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useRoute } from 'vue-router';
import client from '../http/client';
import { API_BASE } from '../config';
import { buildRedirectHref } from '../utils/redirect';
import { initiateGithubLogin } from '../utils/auth';

const route = useRoute();
const form = ref({ username: '', email: '', password: '' });
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);
const toast = ref<{ text: string; type: 'error' | 'success' } | null>(null);
let timer: number | null = null;
const apiBase = API_BASE;

const redirectTo = () => {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('auth_token');
  const href = buildRedirectHref(route.query.redirect, token);
  window.location.href = href;
};

const onGithubLogin = () => {
  const redirect = resolveRedirectUrl(route.query.redirect).toString();
  const target = `${apiBase}/auth/github?redirect=${encodeURIComponent(redirect)}`;
  window.location.href = target;
};

const showMessage = (text: string, type: 'error' | 'success' = 'error') => {
  toast.value = { text, type };
  if (timer) {
    clearTimeout(timer);
  }
  timer = window.setTimeout(() => {
    toast.value = null;
  }, 3200);
};

const onSubmit = async () => {
  error.value = '';
  loading.value = true;
  try {
    if (!form.value.username || form.value.username.length < 3) {
      throw new Error('用户名至少 3 位');
    }
    // basic email format check; avoid over-escaping which was rejecting valid addresses
    if (!form.value.email || !/.+@.+\..+/.test(form.value.email)) {
      throw new Error('请输入有效邮箱');
    }
    if (!form.value.password || form.value.password.length < 6) {
      throw new Error('密码至少 6 位');
    }
    await client<string>('/v1/user/register', form.value);
    showMessage('注册成功，正在跳转...', 'success');
    redirectTo();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '注册失败';
    error.value = msg;
    showMessage(msg, 'error');
  } finally {
    loading.value = false;
  }
};

onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <div class="page">
    <div class="visual-side">
      <h1 class="hero-text">Join the<br>Revolution.</h1>
      <p class="hero-sub">Create your account and start building the impossible. It's free and open.</p>
    </div>

    <div class="form-side">
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
        
        <div class="social-login-group">
          <button class="social-btn github" type="button" @click="onGithubLogin">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 0C5.372 0 0 5.372 0 12c0 5.309 3.438 9.793 8.207 11.387.6.11.82-.26.82-.577 0-.28-.01-1.026-.015-2.015-3.338.725-4.043-1.608-4.043-1.608-.546-1.387-1.332-1.758-1.332-1.758-1.09-.742.082-.728.082-.728 1.205.085 1.838 1.237 1.838 1.237 1.07 1.833 2.809 1.304 3.493.996.108-.775.418-1.304.762-1.605-2.665-.304-5.466-1.334-5.466-5.93 0-1.31.465-2.383 1.235-3.224-.123-.304-.535-1.524.117-3.176 0 0 1.008-.323 3.3-1.23.957-.266 1.98-.399 2.992-.399 1.012 0 2.035.133 2.992.399 2.292.907 3.3 1.23 3.3 1.23.652 1.652.24 2.872.117 3.176.77.84 1.235 1.913 1.235 3.224 0 4.608-2.804 5.62-5.474 5.92.428.369.812 1.102.812 2.22 0 1.605-.015 2.896-.015 3.284 0 .318.21.692.828.577C20.565 21.793 24 17.309 24 12c0-6.628-5.372-12-12-12z"/></svg>
            GitHub
          </button>
        </div>
        <div class="link-row">
          <router-link class="link" to="/login" :query="route.query">返回登录</router-link>
          <span></span>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="toast" class="toast" :data-type="toast.type">
        {{ toast.text }}
      </div>
    </transition>
  </div>
</template>
