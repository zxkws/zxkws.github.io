<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import client from '../http/client';

const router = useRouter();
const route = useRoute();

const form = ref({ email: '', password: '' });
const loading = ref(false);
const error = ref('');
const showPassword = ref(false);
const toast = ref<{ text: string; type: 'error' | 'success' } | null>(null);
let timer: number | null = null;
const apiBase = import.meta.env.MODE === 'development' ? '/api' : 'https://system.zxkws.nyc.mn/api';

const redirectTo = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/v-app/navList';
  window.location.href = redirect;
};

const onGithubLogin = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : 'https://zxkws.nyc.mn/';
  const target = `${apiBase}/auth/github?redirect=${encodeURIComponent(redirect)}`;
  window.location.href = target;
};

const onSubmit = async () => {
  error.value = '';
  loading.value = true;
  try {
    if (!form.value.email || !/.+@.+\..+/.test(form.value.email)) {
      throw new Error('请输入有效邮箱');
    }
    if (!form.value.password || form.value.password.length < 6) {
      throw new Error('密码至少 6 位');
    }
    await client<string>('/v1/user/login', form.value);
    showMessage('登录成功，正在跳转...', 'success');
    redirectTo();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
    showMessage(error.value, 'error');
  } finally {
    loading.value = false;
  }
};

const showMessage = (text: string, type: 'error' | 'success' = 'error') => {
  toast.value = { text, type };
  if (timer) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    toast.value = null;
  }, 3200);
};

onBeforeUnmount(() => {
  if (timer) window.clearTimeout(timer);
});
</script>

<template>
  <div class="page">
    <div class="visual-side">
      <h1 class="hero-text">Work<br>Reimagined.</h1>
      <p class="hero-sub">Enter the workspace designed for the future. Seamless, efficient, and beautiful.</p>
    </div>
    
    <div class="form-side">
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
        <div class="divider">or</div>
        <div class="btn-group">
          <button class="btn ghost small" type="button" @click="onGithubLogin">GitHub 登录</button>
        </div>
        <div class="link-row">
          <span></span>
          <router-link class="link" to="/register" :query="route.query">去注册</router-link>
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

<style scoped>
.divider {
  text-align: center;
  margin: 16px 0;
  color: #64748b;
  font-size: 12px;
  position: relative;
}
.divider::before, .divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}
.divider::before { left: 0; }
.divider::after { right: 0; }

.btn-group {
  display: flex;
  gap: 12px;
}
.btn.small {
  margin-top: 0;
  font-size: 14px;
  padding: 10px;
}
</style>