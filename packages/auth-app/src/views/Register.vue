<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import client from '../http/client';
import { buildRedirectHref } from '../utils/redirect';
import { initiateOAuthLogin, type OAuthProvider } from '../utils/auth';
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

const onOAuthLogin = (provider: OAuthProvider) => {
  initiateOAuthLogin(provider);
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

onMounted(async () => {
  try {
    const response = await client<{
      data?: Partial<Record<OAuthProvider, boolean>>;
    }>('/auth/providers', {}, { method: 'GET' });
    oauthProviders.value = {
      ...oauthProviders.value,
      ...(response.data ?? response),
    };
  } catch {
    // 账号密码注册不依赖第三方提供商状态。
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
</script>

<template>
  <AuthPageShell>
    <template #visual>
      <h1 class="hero-text">One identity.<br />A growing light field.</h1>
      <p class="hero-sub">创建账号后，从同一个入口进入光域的 AI、数据、产品实验与个人效率工具。</p>
    </template>

    <template #form>
      <AuthPanel title="注册" subtitle="创建账号后自动登录" :error="error">
        <RegisterForm :loading="loading" :on-submit="submitRegister" :on-error="onError" />

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
