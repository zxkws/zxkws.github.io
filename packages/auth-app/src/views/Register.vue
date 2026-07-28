<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import client from '../http/client';
import { buildRedirectHref } from '../utils/redirect';
import { initiateGithubLogin } from '../utils/auth';
import { useToast } from '../composables/useToast';
import ToastMessage from '../components/common/ToastMessage.vue';
import GithubLoginButton from '../components/auth/GithubLoginButton.vue';
import AuthPageShell from '../components/auth/AuthPageShell.vue';
import AuthPanel from '../components/auth/AuthPanel.vue';
import RegisterForm from '../components/auth/RegisterForm.vue';

const route = useRoute();
const loading = ref(false);
const error = ref('');
const { toast, showToast } = useToast();

const redirectTo = () => {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('auth_token');
  const href = buildRedirectHref(route.query.redirect, token);
  window.location.href = href;
};

const onGithubLogin = () => {
  initiateGithubLogin(route.query.redirect);
};

const onError = (message: string) => {
  error.value = message;
  showToast(message, 'error');
};

const submitRegister = async (payload: { username: string; email: string; password: string }) => {
  error.value = '';
  loading.value = true;
  try {
    await client<string>('/v1/user/register', payload);
    showToast('注册成功，正在跳转...', 'success');
    redirectTo();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '注册失败';
    onError(msg);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthPageShell>
    <template #visual>
      <h1 class="hero-text">One account.<br />The whole workspace.</h1>
      <p class="hero-sub">创建账号后，从同一个入口进入数据库、AI、权限和个人效率工具。</p>
    </template>

    <template #form>
      <AuthPanel title="注册" subtitle="创建账号后自动登录" :error="error">
        <RegisterForm :loading="loading" :on-submit="submitRegister" :on-error="onError" />

        <GithubLoginButton :disabled="loading" @click="onGithubLogin" />
        <div class="link-row">
          <router-link class="link" :to="{ path: '/login', query: route.query }">返回登录</router-link>
          <span></span>
        </div>
      </AuthPanel>
    </template>

    <template #toast>
      <ToastMessage :toast="toast" />
    </template>
  </AuthPageShell>
</template>
