<template>
  <div v-if="store.loading" class="loading-overlay" role="status" aria-live="polite">
    <div class="loading-card">
      <span class="loading-spinner" aria-hidden="true" />
      <span>{{ store.loadingMessage }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { mainStore } from '../store';

const store = mainStore();
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  z-index: 999;
  inset: 0;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--color-canvas) 72%, transparent);
  backdrop-filter: blur(3px);
}

.loading-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-fg-secondary);
  box-shadow: var(--shadow-md);
  font-size: 13px;
  font-weight: 500;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border-strong);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: loading-spin 0.7s linear infinite;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation-duration: 1.8s;
  }
}
</style>
