<script setup lang="ts">
import type { ToastPayload } from '../../composables/useToast';

defineProps<{
  toast: ToastPayload | null;
}>();
</script>

<template>
  <transition name="fade">
    <div v-if="toast" class="toast" :data-type="toast.type">
      {{ toast.text }}
    </div>
  </transition>
</template>

