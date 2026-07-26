<script setup lang="ts">
import { ref } from 'vue';
import { isValidEmail, isValidUsername } from '../../utils/validators';
import PasswordField from './PasswordField.vue';

const props = defineProps<{
  loading: boolean;
  onSubmit: (_payload: { username: string; email: string; password: string }) => Promise<void>;
  onError: (_message: string) => void;
}>();

const form = ref({ username: '', email: '', password: '' });

const submit = async () => {
  const username = form.value.username.trim();
  const email = form.value.email.trim();
  const password = form.value.password;

  if (!isValidUsername(username)) {
    props.onError('用户名需为 6-30 位，仅支持字母、数字和 # $ % _ - 字符');
    return;
  }
  if (!email || !isValidEmail(email)) {
    props.onError('请输入有效邮箱');
    return;
  }
  if (!password || password.length < 6) {
    props.onError('密码至少 6 位');
    return;
  }

  await props.onSubmit({ username, email, password });
};
</script>

<template>
  <div>
    <div class="field">
      <label class="label">用户名</label>
      <input v-model="form.username" type="text" placeholder="your name" autocomplete="username" />
    </div>

    <div class="field">
      <label class="label">邮箱</label>
      <input v-model="form.email" type="email" placeholder="you@example.com" autocomplete="email" />
    </div>

    <PasswordField v-model="form.password" label="密码" autocomplete="new-password" />

    <button class="btn" :disabled="loading" type="button" @click="submit">
      {{ loading ? '注册中...' : '注册并登录' }}
    </button>
  </div>
</template>

