<script lang="ts" setup>
import { Dialog, DialogPanel, TransitionRoot } from '@headlessui/vue';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mainStore } from '@/store';

const store = mainStore();
const route = useRoute();
const router = useRouter();
const isMenuOpen = computed(() => store.isMenuOpen);
const isMenuCollapsed = computed(() => store.isMenuCollapsed);

const menus = [
  { label: '文本对比', code: 'DF', name: 'textDifference' },
  { label: 'JSON 工具', code: '{}', name: 'jsonViewer' },
  { label: '待办事项', code: 'TD', name: 'todo' },
  { label: '支付订单', code: 'PY', name: 'payment' },
];

const closeMenu = () => {
  store.isMenuOpen = false;
};

const navigate = async (name: string) => {
  await router.push({ name });
  closeMenu();
};
</script>

<template>
  <TransitionRoot as="template" :show="isMenuOpen">
    <Dialog as="div" class="tool-menu-dialog" @close="closeMenu">
      <button class="tool-menu-backdrop" type="button" aria-label="关闭导航" @click="closeMenu" />
      <DialogPanel class="tool-menu-panel tool-menu-panel--mobile">
        <div class="tool-menu-title">工具导航</div>
        <nav aria-label="工具导航">
          <button
            v-for="menu in menus"
            :key="menu.name"
            type="button"
            class="tool-menu-link"
            :data-active="route.name === menu.name"
            @click="navigate(menu.name)"
          >
            <span class="tool-menu-code">{{ menu.code }}</span>
            <span>{{ menu.label }}</span>
          </button>
        </nav>
      </DialogPanel>
    </Dialog>
  </TransitionRoot>

  <aside class="tool-menu-panel tool-menu-panel--desktop" :data-collapsed="isMenuCollapsed">
    <div v-if="!isMenuCollapsed" class="tool-menu-title">工具导航</div>
    <nav aria-label="工具导航">
      <button
        v-for="menu in menus"
        :key="menu.name"
        type="button"
        class="tool-menu-link"
        :data-active="route.name === menu.name"
        :title="menu.label"
        @click="navigate(menu.name)"
      >
        <span class="tool-menu-code">{{ menu.code }}</span>
        <span v-if="!isMenuCollapsed">{{ menu.label }}</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.tool-menu-panel {
  width: 224px;
  padding: 14px 10px;
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-fg);
  transition: width var(--duration-base) var(--ease-standard);
}

.tool-menu-panel[data-collapsed='true'] {
  width: 64px;
}

.tool-menu-title {
  padding: 4px 10px 12px;
  color: var(--color-fg-tertiary);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tool-menu-panel nav {
  display: grid;
  gap: 4px;
}

.tool-menu-link {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  gap: 10px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-fg-secondary);
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.tool-menu-link:hover {
  background: var(--color-surface-2);
  color: var(--color-fg);
}

.tool-menu-link[data-active='true'] {
  border-color: color-mix(in srgb, var(--color-primary-deep) 45%, var(--color-border));
  background: var(--color-primary-muted);
  color: var(--color-fg);
}

.tool-menu-code {
  display: inline-grid;
  width: 28px;
  height: 24px;
  flex: 0 0 28px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-fg-tertiary);
  font-family: var(--font-mono);
  font-size: 9px;
}

.tool-menu-link[data-active='true'] .tool-menu-code {
  border-color: var(--color-primary-deep);
  color: var(--color-primary-active);
}

.tool-menu-dialog {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: none;
}

.tool-menu-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(0 0 0 / 45%);
}

.tool-menu-panel--mobile {
  position: relative;
  z-index: 1;
  height: 100%;
  box-shadow: var(--shadow-xl);
}

@media (max-width: 767px) {
  .tool-menu-panel--desktop {
    display: none;
  }

  .tool-menu-dialog {
    display: block;
  }
}
</style>
