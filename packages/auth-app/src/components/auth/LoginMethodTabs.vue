<script setup lang="ts">
type TabValue = 'password' | 'sms';

defineProps<{
  modelValue: TabValue;
  smsEnabled: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: TabValue): void;
}>();
</script>

<template>
  <div class="tabs">
    <button
      class="tab"
      :data-active="modelValue === 'password'"
      type="button"
      @click="emit('update:modelValue', 'password')"
    >
      账号密码
    </button>
    <button
      v-if="smsEnabled"
      class="tab"
      :data-active="modelValue === 'sms'"
      type="button"
      @click="emit('update:modelValue', 'sms')"
    >
      手机验证码
    </button>
  </div>
</template>
