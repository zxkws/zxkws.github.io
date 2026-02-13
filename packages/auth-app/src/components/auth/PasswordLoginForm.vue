<script setup lang="ts">
import { ref } from 'vue';
import { isValidEmail } from '../../utils/validators';
import PasswordField from './PasswordField.vue';

const props = defineProps<{
  loading: boolean;
  onSubmit: (_payload: { email: string; password: string }) => Promise<void>;
  onError: (_message: string) => void;
}>();

const email = ref('');
const password = ref('');

const submit = async () => {
  const normalizedEmail = email.value.trim();
  const normalizedPassword = password.value;
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    props.onError('请输入有效邮箱');
    return;
  }
  if (!normalizedPassword || normalizedPassword.length < 6) {
    props.onError('密码至少 6 位');
    return;
  }

  await props.onSubmit({ email: normalizedEmail, password: normalizedPassword });
};
</script>

<template>
  <div>
    <div class="field">
      <label class="label">邮箱</label>
      <input v-model="email" type="email" placeholder="you@example.com" autocomplete="email" />
    </div>

    <PasswordField v-model="password" label="密码" autocomplete="current-password" />

    <button class="btn" :disabled="loading" type="button" @click="submit">{{ loading ? '登录中...' : '登录' }}</button>
  </div>
</template>
