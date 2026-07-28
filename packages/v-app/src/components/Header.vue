<script lang="ts" setup>
import { mainStore } from '@/store';

const store = mainStore();

const themeOptions = [
  { label: '浅色', value: 'light' as const },
  { label: '深色', value: 'dark' as const },
  { label: '跟随系统', value: 'system' as const },
];
</script>

<template>
  <header class="tool-header">
    <div class="tool-header__left">
      <button
        type="button"
        class="tool-header__icon tool-header__mobile-menu"
        aria-label="打开导航"
        @click="store.toggleMenu()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <button
        type="button"
        class="tool-header__icon tool-header__collapse"
        :aria-label="store.isMenuCollapsed ? '展开导航' : '收起导航'"
        @click="store.toggleMenuCollapse()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7h14M5 12h9M5 17h14" />
        </svg>
      </button>
      <a class="tool-header__brand" href="/">
        <span class="tool-header__brand-mark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="12" r="6.5" />
            <circle cx="11" cy="12" r="2.25" />
            <path d="M2.5 12H4M18 12h3.5M11 3.5V2M11 22v-1.5" />
          </svg>
        </span>
        <span>光域工具集</span>
      </a>
    </div>

    <div class="tool-theme-switch" aria-label="主题设置">
      <button
        v-for="option in themeOptions"
        :key="option.value"
        type="button"
        :data-active="store.theme === option.value"
        @click="store.setTheme(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.tool-header {
  display: flex;
  height: 58px;
  flex: 0 0 58px;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 0 18px;
  border-bottom: 1px solid var(--color-border);
  background: color-mix(in srgb, var(--color-surface) 94%, transparent);
}

.tool-header__left {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.tool-header__icon {
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-fg-tertiary);
  cursor: pointer;
}

.tool-header__icon:hover {
  border-color: var(--color-border);
  background: var(--color-surface-2);
  color: var(--color-fg);
}

.tool-header__icon svg {
  width: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.tool-header__mobile-menu {
  display: none;
}

.tool-header__brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  color: var(--color-fg);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.tool-header__brand-mark {
  display: inline-grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border-radius: 5px;
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.tool-header__brand-mark svg {
  width: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.7;
}

.tool-header__brand-mark svg circle:nth-child(2) {
  fill: currentColor;
  stroke: none;
}

.tool-theme-switch {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface-2);
}

.tool-theme-switch button {
  padding: 5px 8px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-fg-tertiary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}

.tool-theme-switch button[data-active='true'] {
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: var(--shadow-xs);
}

@media (max-width: 767px) {
  .tool-header {
    padding: 0 12px;
  }

  .tool-header__mobile-menu {
    display: inline-grid;
  }

  .tool-header__collapse {
    display: none;
  }

  .tool-theme-switch button {
    min-width: 32px;
    padding: 0 7px;
  }
}
</style>
