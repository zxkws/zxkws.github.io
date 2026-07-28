<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import client from '../http/client';
import { buildRedirectHref } from '../utils/redirect';
import { initiateOAuthLogin, type OAuthProvider } from '../utils/auth';
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
const smsEnabled = ref(false);
const oauthProviders = ref<Record<OAuthProvider, boolean>>({
  github: false,
  google: false,
  wechat: false,
  alipay: false,
});

const redirectTo = () => {
  const href = buildRedirectHref(route.query.redirect);
  window.location.href = href;
};

const onError = (message: string) => {
  error.value = message;
  showToast(message, 'error');
};

const onOAuthLogin = (provider: OAuthProvider) => {
  initiateOAuthLogin(provider);
};

const submitPasswordLogin = async (payload: { email: string; password: string }) => {
  error.value = '';
  loading.value = true;
  try {
    await client('/auth/password/login', payload, { method: 'POST' });
    showToast('登录成功，正在跳转...', 'success');
    redirectTo();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '登录失败';
    onError(msg);
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  try {
    const response = await client<
      | Partial<Record<OAuthProvider | 'sms', boolean>>
      | { data?: Partial<Record<OAuthProvider | 'sms', boolean>> }
    >('/auth/providers', {}, { method: 'GET' });
    const status = (
      response && typeof response === 'object' && 'data' in response ? response.data ?? {} : response
    ) as Partial<Record<OAuthProvider | 'sms', boolean>>;
    smsEnabled.value = status.sms === true;
    oauthProviders.value = {
      ...oauthProviders.value,
      ...status,
    };
  } catch {
    // 密码和短信登录不依赖第三方提供商状态。
  }
  const code = typeof route.query.auth_code === 'string' ? route.query.auth_code : '';
  if (!code) return;
  loading.value = true;
  try {
    await client('/auth/exchange', { code }, { method: 'POST' });
    showToast('第三方登录成功，正在跳转...', 'success');
    redirectTo();
  } catch (err) {
    onError(err instanceof Error ? err.message : '第三方登录交换失败');
  } finally {
    loading.value = false;
  }
});

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
      <h1 class="hero-text">Enter the lab.<br />Keep building.</h1>
      <p class="hero-sub">进入光域控制台，继续管理 AI、数据、产品实验与个人工作流。</p>
    </template>

    <template #form>
      <AuthPanel title="登录" subtitle="进入光域工作台" :error="error">
        <LoginMethodTabs v-model="activeTab" :sms-enabled="smsEnabled" />

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

        <div class="oauth-grid">
          <GithubLoginButton
            v-if="oauthProviders.github"
            :disabled="loading"
            @click="onOAuthLogin('github')"
          />
          <button
            v-if="oauthProviders.google"
            class="social-btn"
            type="button"
            :disabled="loading"
            @click="onOAuthLogin('google')"
          >
            Google
          </button>
          <button
            v-if="oauthProviders.wechat"
            class="social-btn"
            type="button"
            :disabled="loading"
            @click="onOAuthLogin('wechat')"
          >
            微信
          </button>
          <button
            v-if="oauthProviders.alipay"
            class="social-btn"
            type="button"
            :disabled="loading"
            @click="onOAuthLogin('alipay')"
          >
            支付宝
          </button>
        </div>

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
