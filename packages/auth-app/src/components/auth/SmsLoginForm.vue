<script setup lang="ts">
import { ref } from 'vue';
import { useCountdown } from '../../composables/useCountdown';
import { isValidPhone, isValidSmsCode } from '../../utils/validators';

const props = defineProps<{
  loading: boolean;
  onSendCode: (_phone: string) => Promise<{ devCode?: string } | void>;
  onSubmit: (_payload: { phone: string; code: string }) => Promise<void>;
  onError: (_message: string) => void;
}>();

const phone = ref('');
const code = ref('');
const sending = ref(false);
const { secondsLeft, start } = useCountdown();

const sendCode = async () => {
  if (secondsLeft.value > 0) return;
  const normalizedPhone = phone.value.trim();
  if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
    props.onError('请输入有效手机号（仅数字，可带 + 国家码）');
    return;
  }

  sending.value = true;
  try {
    const res = await props.onSendCode(normalizedPhone);
    start(60);
    if (res && typeof res === 'object' && typeof (res as any).devCode === 'string') {
      code.value = (res as any).devCode;
    }
  } finally {
    sending.value = false;
  }
};

const submit = async () => {
  const normalizedPhone = phone.value.trim();
  const normalizedCode = code.value.trim();
  if (!normalizedPhone || !isValidPhone(normalizedPhone)) {
    props.onError('请输入有效手机号（仅数字，可带 + 国家码）');
    return;
  }
  if (!normalizedCode || !isValidSmsCode(normalizedCode)) {
    props.onError('请输入有效验证码（4-8 位数字）');
    return;
  }

  await props.onSubmit({ phone: normalizedPhone, code: normalizedCode });
};
</script>

<template>
  <div>
    <div class="field">
      <label class="label">手机号</label>
      <input v-model="phone" type="tel" placeholder="+8613800138000" autocomplete="tel" />
    </div>
    <div class="field">
      <label class="label">验证码</label>
      <div class="input-wrap">
        <input v-model="code" class="has-right-action" type="text" placeholder="6 位数字" inputmode="numeric" />
        <button type="button" class="input-action" :disabled="sending || secondsLeft > 0" @click="sendCode">
          {{ secondsLeft > 0 ? `${secondsLeft}s` : sending ? '发送中' : '发送' }}
        </button>
      </div>
    </div>
    <button class="btn" :disabled="loading" type="button" @click="submit">{{ loading ? '登录中...' : '登录' }}</button>
  </div>
</template>
