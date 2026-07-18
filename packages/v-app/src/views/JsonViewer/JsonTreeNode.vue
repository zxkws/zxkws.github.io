<script setup lang="ts">
import { computed, ref, watch } from 'vue';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const props = defineProps<{
  nodeKey?: string;
  value: JsonValue;
  depth: number;
  expandMode: 'expand' | 'collapse' | null;
  expandVersion: number;
}>();

const expanded = ref(props.expandMode ? props.expandMode === 'expand' : props.depth < 2);
const isArray = computed(() => Array.isArray(props.value));
const isContainer = computed(() => props.value !== null && typeof props.value === 'object');
const entries = computed(() =>
  isContainer.value ? Object.entries(props.value as JsonValue[] | Record<string, JsonValue>) : [],
);
const containerLabel = computed(() => {
  if (!isContainer.value) return '';
  return isArray.value ? `Array(${entries.value.length})` : `Object(${entries.value.length})`;
});
const primitiveClass = computed(() => {
  if (props.value === null) return 'json-null';
  return `json-${typeof props.value}`;
});
const primitiveText = computed(() =>
  typeof props.value === 'string' ? JSON.stringify(props.value) : String(props.value),
);

watch(
  () => props.expandVersion,
  () => {
    if (props.expandMode) expanded.value = props.expandMode === 'expand';
  },
);
</script>

<template>
  <div class="json-tree-node">
    <div class="json-tree-line" :style="{ '--tree-depth': depth }">
      <button v-if="isContainer" class="tree-toggle" type="button" @click="expanded = !expanded">
        {{ expanded ? '⌄' : '›' }}
      </button>
      <span v-else class="tree-toggle-placeholder"></span>
      <span v-if="nodeKey !== undefined" class="json-key">{{ nodeKey }}</span>
      <span v-if="nodeKey !== undefined" class="json-colon">:</span>
      <button v-if="isContainer" class="container-label" type="button" @click="expanded = !expanded">
        {{ containerLabel }}
      </button>
      <span v-else class="json-primitive" :class="primitiveClass">{{ primitiveText }}</span>
    </div>

    <div v-if="isContainer && expanded" class="json-tree-children">
      <JsonTreeNode
        v-for="[key, childValue] in entries"
        :key="key"
        :node-key="key"
        :value="childValue"
        :depth="depth + 1"
        :expand-mode="expandMode"
        :expand-version="expandVersion"
      />
    </div>
  </div>
</template>

<style scoped>
.json-tree-line {
  display: flex;
  min-height: 27px;
  align-items: center;
  padding-right: 12px;
  padding-left: calc(10px + var(--tree-depth) * 18px);
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
  font: 12px/1.55 var(--font-mono);
}

.json-tree-line:hover {
  background: var(--color-surface-3);
}

.tree-toggle,
.container-label {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.tree-toggle,
.tree-toggle-placeholder {
  width: 22px;
  flex: none;
}

.tree-toggle {
  padding: 0;
  color: var(--color-fg-tertiary);
  background: transparent;
  font-size: 17px;
}

.json-key {
  color: #7c3aed;
  font-weight: 650;
}

.json-colon {
  margin-right: 7px;
  color: var(--color-fg-tertiary);
}

.container-label {
  padding: 1px 6px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
  border-radius: 5px;
  font-size: 10px;
}

.json-string {
  color: #047857;
}
.json-number {
  color: #2563eb;
}
.json-boolean {
  color: #b45309;
}
.json-null {
  color: #be123c;
  font-style: italic;
}

html.dark .json-key {
  color: #c4b5fd;
}
html.dark .json-string {
  color: #6ee7b7;
}
html.dark .json-number {
  color: #93c5fd;
}
html.dark .json-boolean {
  color: #fcd34d;
}
html.dark .json-null {
  color: #fda4af;
}
</style>
