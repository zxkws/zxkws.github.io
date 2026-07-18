<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import JsonTreeNode from './JsonTreeNode.vue';
import './styles.css';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type OutputMode = 'tree' | 'text';

const sample = `{
  "name": "JSON 工作台",
  "ready": true,
  "features": ["格式化", "压缩", "树形浏览", "折叠节点"],
  "meta": {
    "local": true,
    "upload": false
  }
}`;

const input = ref('');
const parsed = ref<JsonValue | undefined>();
const parseError = ref('');
const indent = ref<2 | 4>(2);
const outputMode = ref<OutputMode>('tree');
const expandMode = ref<'expand' | 'collapse' | null>(null);
const expandVersion = ref(0);
let parseTimer: ReturnType<typeof setTimeout> | undefined;

const formatted = computed(() => (parsed.value === undefined ? '' : JSON.stringify(parsed.value, null, indent.value)));
const valueSummary = computed(() => {
  const value = parsed.value;
  if (value === undefined) return '等待输入';
  if (Array.isArray(value)) return `数组 · ${value.length} 项`;
  if (value !== null && typeof value === 'object') return `对象 · ${Object.keys(value).length} 个键`;
  return typeof value;
});
const inputLineNumbers = computed(() =>
  Array.from({ length: input.value === '' ? 1 : input.value.split('\n').length }, (_, index) => index + 1),
);
const outputLineNumbers = computed(() =>
  Array.from({ length: formatted.value === '' ? 1 : formatted.value.split('\n').length }, (_, index) => index + 1),
);

const parse = () => {
  if (input.value === '') {
    parsed.value = undefined;
    parseError.value = '';
    return;
  }
  try {
    parsed.value = JSON.parse(input.value) as JsonValue;
    parseError.value = '';
  } catch (error) {
    parsed.value = undefined;
    parseError.value = error instanceof Error ? error.message : String(error);
  }
};

watch(input, () => {
  if (parseTimer) clearTimeout(parseTimer);
  parseTimer = setTimeout(parse, 160);
});

onBeforeUnmount(() => {
  if (parseTimer) clearTimeout(parseTimer);
});

const formatInput = () => {
  parse();
  if (parsed.value !== undefined) input.value = JSON.stringify(parsed.value, null, indent.value);
};

const compressInput = () => {
  parse();
  if (parsed.value !== undefined) input.value = JSON.stringify(parsed.value);
};

const copyOutput = async () => {
  if (formatted.value !== '') await navigator.clipboard.writeText(formatted.value);
};

const downloadOutput = () => {
  if (formatted.value === '') return;
  const objectUrl = URL.createObjectURL(new Blob([formatted.value], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = 'data.json';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const toggleAll = (mode: 'expand' | 'collapse') => {
  expandMode.value = mode;
  expandVersion.value += 1;
};

const syncGutter = (event: Event) => {
  const target = event.target as HTMLElement;
  const gutter = target.parentElement?.querySelector<HTMLElement>('.json-line-numbers');
  if (gutter) gutter.scrollTop = target.scrollTop;
};
</script>

<template>
  <main class="json-workbench">
    <header class="json-commandbar">
      <div class="json-brand">
        <span>{ }</span>
        <div><strong>JSON 工具</strong><small>解析、格式化与树形浏览</small></div>
      </div>
      <div class="json-actions">
        <button type="button" @click="input = sample">示例</button>
        <button type="button" @click="formatInput">格式化</button>
        <button type="button" @click="compressInput">压缩</button>
        <label
          >缩进<select v-model="indent">
            <option :value="2">2 空格</option>
            <option :value="4">4 空格</option>
          </select></label
        >
        <button type="button" @click="void copyOutput()">复制</button>
        <button type="button" @click="downloadOutput">保存</button>
        <button class="danger" type="button" @click="input = ''">清空</button>
      </div>
    </header>

    <section class="json-workspace">
      <article class="json-pane input-pane">
        <header>
          <div>
            <strong>JSON 输入</strong><span>{{ input.length }} 字符</span>
          </div>
          <span :class="parseError ? 'status-error' : 'status-valid'">{{
            input === '' ? '等待输入' : parseError ? '格式错误' : '有效 JSON'
          }}</span>
        </header>
        <div class="json-editor">
          <div class="json-line-numbers" aria-hidden="true">
            <span v-for="line in inputLineNumbers" :key="line">{{ line }}</span>
          </div>
          <textarea
            v-model="input"
            aria-label="JSON 输入"
            placeholder="粘贴 JSON 字符串…"
            spellcheck="false"
            @scroll="syncGutter"
          />
        </div>
        <footer v-if="parseError" class="json-error">{{ parseError }}</footer>
      </article>

      <article class="json-pane output-pane">
        <header>
          <div>
            <strong>序列化结果</strong><span>{{ valueSummary }}</span>
          </div>
          <div class="output-tools">
            <div class="json-segmented">
              <button :class="{ active: outputMode === 'tree' }" type="button" @click="outputMode = 'tree'">树形</button
              ><button :class="{ active: outputMode === 'text' }" type="button" @click="outputMode = 'text'">
                文本
              </button>
            </div>
            <template v-if="outputMode === 'tree'"
              ><button type="button" @click="toggleAll('expand')">全部展开</button
              ><button type="button" @click="toggleAll('collapse')">全部折叠</button></template
            >
          </div>
        </header>
        <div v-if="parsed === undefined" class="json-empty">
          <b>{ }</b><span>{{ parseError || '输入 JSON 后在这里查看结果' }}</span>
        </div>
        <div v-else-if="outputMode === 'tree'" class="json-tree">
          <JsonTreeNode :value="parsed" :depth="0" :expand-mode="expandMode" :expand-version="expandVersion" />
        </div>
        <div v-else class="json-editor output-editor">
          <div class="json-line-numbers" aria-hidden="true">
            <span v-for="line in outputLineNumbers" :key="line">{{ line }}</span>
          </div>
          <pre @scroll="syncGutter">{{ formatted }}</pre>
        </div>
      </article>
    </section>
  </main>
</template>
