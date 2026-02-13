<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  modelValue: string;
  label: string;
  placeholder?: string;
  autocomplete?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
});

const show = ref(false);
</script>

<template>
  <div class="field">
    <label class="label">{{ label }}</label>
    <div class="input-wrap">
      <input
        v-model="value"
        class="has-right-action"
        :type="show ? 'text' : 'password'"
        :placeholder="placeholder || '••••••••'"
        :autocomplete="autocomplete || 'current-password'"
      />
      <button
        type="button"
        class="input-action"
        :aria-label="show ? '隐藏密码' : '显示密码'"
        @click="show = !show"
      >
        {{ show ? '隐藏' : '显示' }}
      </button>
    </div>
  </div>
</template>

