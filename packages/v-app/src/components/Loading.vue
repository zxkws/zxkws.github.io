<template>
  <div id="loader-wrapper" v-if="store.loading">
    <div class="loader">
      <div class="loader-circle" />
      <div class="loader-text">
        <span class="tip"> {{ store.loadingMessage }} </span>
      </div>
    </div>
    <div class="loader-section section-left" />
    <div class="loader-section section-right" />
  </div>
</template>

<script setup>
import { mainStore } from '../store';

const store = mainStore();
</script>

<style scoped>
#loader-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
}

#loader-wrapper .loader {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

#loader-wrapper .loader .loader-circle {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #fff;
  animation: spin 1.8s linear infinite;
  z-index: 2;
  position: relative;
}

#loader-wrapper .loader .loader-circle::before {
  content: '';
  position: absolute;
  top: 5px;
  left: 5px;
  right: 5px;
  bottom: 5px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #a4a4a4;
  animation: spin-reverse 0.6s linear infinite;
}

#loader-wrapper .loader .loader-circle::after {
  content: '';
  position: absolute;
  top: 15px;
  left: 15px;
  right: 15px;
  bottom: 15px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #d3d3d3;
  animation: spin 1s linear infinite;
}

#loader-wrapper .loader .loader-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
  z-index: 2;
  margin-top: 40px;
  font-size: 24px;
}

#loader-wrapper .loader .loader-text .tip {
  margin-top: 6px;
  font-size: 18px;
  opacity: 0.6;
}

#loader-wrapper .loader-section {
  position: fixed;
  top: 0;
  width: 51%;
  height: 100%;
  z-index: 1;
}

#loader-wrapper .loader-section.section-left {
  left: 0;
}

#loader-wrapper .loader-section.section-right {
  right: 0;
}

#loader-wrapper.loaded {
  visibility: hidden;
  transform: translateY(-100%);
  transition:
    transform 0.3s 1s ease-out,
    visibility 0.3s 1s ease-out;
}

#loader-wrapper.loaded .loader .loader-circle,
#loader-wrapper.loaded .loader .loader-text {
  opacity: 0;
  transition: opacity 0.3s ease-out;
}

#loader-wrapper.loaded .loader-section.section-left {
  transform: translateX(-100%);
  transition: transform 0.5s 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

#loader-wrapper.loaded .loader-section.section-right {
  transform: translateX(100%);
  transition: transform 0.5s 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@keyframes spin-reverse {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(-360deg);
  }
}
</style>
