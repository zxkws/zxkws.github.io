<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

import client from '../http/client';
import { buildRedirectHref } from '../utils/redirect';
import { initiateGithubLogin } from '../utils/auth';
import { useToast } from '../composables/useToast';

import ToastMessage from '../components/common/ToastMessage.vue';
import AuthPageShell from '../components/auth/AuthPageShell.vue';
import AuthPanel from '../components/auth/AuthPanel.vue';
import LoginMethodTabs from '../components/auth/LoginMethodTabs.vue';
import PasswordLoginForm from '../components/auth/PasswordLoginForm.vue';
import SmsLoginForm from '../components/auth/SmsLoginForm.vue';
import GithubLoginButton from '../components/auth/GithubLoginButton.vue';

const route = useRoute();
const { toast, showToast } = useToast();

const activeTab = ref<'password' | 'sms'>('password');
const loading = ref(false);
const error = ref('');

const redirectTo = () => {
  const token = typeof window === 'undefined' ? null : window.localStorage.getItem('auth_token');
  const href = buildRedirectHref(route.query.redirect, token);
  window.location.href = href;
};

const onError = (message: string) => {
  error.value = message;
  showToast(message, 'error');
};

const onGithubLogin = () => {
  initiateGithubLogin(route.query.redirect);
};

const submitPasswordLogin = async (payload: { email: string; password: string }) => {
  error.value = '';
  loading.value = true;
  try {
    await client<string>('/v1/user/login', payload);
    showToast('登录成功，正在跳转...', 'success');
    redirectTo();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '登录失败';
    onError(msg);
  } finally {
    loading.value = false;
  }
};

const sendSmsCode = async (phone: string) => {
  try {
    const res = await client<{
      code: number;
      data?: { sent: boolean; ttlSeconds: number; devCode?: string };
      message: string;
    }>('/auth/sms/send', { phone }, { method: 'POST' });
    showToast('验证码已发送', 'success');
    const devCode = res?.data?.devCode;
    if (devCode) {
      showToast(`devCode: ${devCode}`, 'success');
      return { devCode };
    }
    return undefined;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '发送失败';
    onError(msg);
    throw err;
  }
};

const submitSmsLogin = async (payload: { phone: string; code: string }) => {
  error.value = '';
  loading.value = true;
  try {
    await client('/auth/sms/login', payload, { method: 'POST' });
    showToast('登录成功，正在跳转...', 'success');
    redirectTo();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '登录失败';
    onError(msg);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <AuthPageShell>
    <template #visual>
      <h1 class="hero-text">Tools first.<br />Workspace behind.</h1>
      <p class="hero-sub">公开工具无需登录；数据库、AI 与权限能力，在一个账号之后保持集中和安静。</p>
    </template>

    <template #form>
      <AuthPanel title="登录" subtitle="进入工作台" :error="error">
        <LoginMethodTabs v-model="activeTab" />

        <PasswordLoginForm
          v-if="activeTab === 'password'"
          :loading="loading"
          :on-submit="submitPasswordLogin"
          :on-error="onError"
        />
        <SmsLoginForm
          v-else
          :loading="loading"
          :on-send-code="sendSmsCode"
          :on-submit="submitSmsLogin"
          :on-error="onError"
        />

        <GithubLoginButton :disabled="loading" @click="onGithubLogin" />

        <div class="link-row">
          <span></span>
          <router-link class="link" :to="{ path: '/register', query: route.query }">去注册</router-link>
        </div>
      </AuthPanel>
    </template>

    <template #toast>
      <ToastMessage :toast="toast" />
    </template>
  </AuthPageShell>
</template>
