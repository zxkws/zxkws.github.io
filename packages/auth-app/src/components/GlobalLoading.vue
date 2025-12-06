<template>
  <transition name="fade">
    <div v-if="loading" class="global-loading" role="status" aria-live="polite" aria-busy="true">
      <div class="pill">
        <span class="spinner" aria-hidden="true" />
        <span class="text">加载中...</span>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { isGlobalLoading } from '../http/loading';

const loading = isGlobalLoading;
</script>

<style scoped>
.global-loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 16px;
  pointer-events: none;
  z-index: 2000;
}

.pill {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.35);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(10px);
  pointer-events: auto;
  font-size: 14px;
  font-weight: 600;
}

.spinner {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 3px solid rgba(148, 163, 184, 0.35);
  border-top-color: #6366f1;
  animation: spin 0.75s linear infinite;
}

.text {
  white-space: nowrap;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
