<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { buildTextDiff, type DiffRow } from './diff';

type Side = 'left' | 'right';
const sides: Side[] = ['left', 'right'];

const leftText = ref('');
const rightText = ref('');
const diffResult = ref(buildTextDiff('', ''));
const activeDifference = ref(0);
const isDragging = ref<Side | null>(null);
let compareTimer: ReturnType<typeof setTimeout> | undefined;

const differenceRows = computed(() =>
  diffResult.value.rows.map((row, index) => ({ row, index })).filter(({ row }) => row.type !== 'equal'),
);
const hasText = computed(() => leftText.value !== '' || rightText.value !== '');
const leftLineCount = computed(() => (leftText.value === '' ? 0 : leftText.value.split('\n').length));
const rightLineCount = computed(() => (rightText.value === '' ? 0 : rightText.value.split('\n').length));

const compare = () => {
  diffResult.value = buildTextDiff(leftText.value, rightText.value);
  activeDifference.value = 0;
};

watch(
  [leftText, rightText],
  () => {
    if (compareTimer) clearTimeout(compareTimer);
    compareTimer = setTimeout(compare, 180);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (compareTimer) clearTimeout(compareTimer);
});

const clearSide = (side: Side) => {
  if (side === 'left') leftText.value = '';
  else rightText.value = '';
};

const swapTexts = () => {
  [leftText.value, rightText.value] = [rightText.value, leftText.value];
};

const downloadText = (side: Side) => {
  const content = side === 'left' ? leftText.value : rightText.value;
  const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = side === 'left' ? '原始文本.txt' : '修改后文本.txt';
  link.click();
  URL.revokeObjectURL(blobUrl);
};

const readFile = async (side: Side, file?: File) => {
  if (!file) return;
  const content = await file.text();
  if (side === 'left') leftText.value = content;
  else rightText.value = content;
};

const selectFile = (side: Side, event: Event) => {
  const input = event.target as HTMLInputElement;
  void readFile(side, input.files?.[0]);
  input.value = '';
};

const dropFile = (side: Side, event: DragEvent) => {
  isDragging.value = null;
  void readFile(side, event.dataTransfer?.files[0]);
};

const jumpToDifference = async (direction: -1 | 1) => {
  const count = differenceRows.value.length;
  if (!count) return;
  activeDifference.value = (activeDifference.value + direction + count) % count;
  await nextTick();
  document
    .querySelector(`[data-diff-index="${activeDifference.value}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const lineClass = (row: DiffRow, side: Side) => ({
  'is-empty': side === 'left' ? row.leftLineNumber === null : row.rightLineNumber === null,
  'is-added': side === 'right' && (row.type === 'added' || row.type === 'changed'),
  'is-removed': side === 'left' && (row.type === 'removed' || row.type === 'changed'),
});
</script>

<template>
  <main class="text-diff-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">TEXT DIFF</p>
        <h1>文本对比</h1>
        <p class="subtitle">在本地实时比较两段文本，内容不会上传。</p>
      </div>
      <div class="header-actions">
        <button class="button button-secondary" type="button" @click="swapTexts">
          <span aria-hidden="true">⇄</span>交换两侧
        </button>
        <button class="button button-primary" type="button" @click="compare">立即对比</button>
      </div>
    </header>

    <section class="editor-grid" aria-label="待比较文本">
      <article
        v-for="side in sides"
        :key="side"
        class="editor-card"
        :class="{ 'is-dragging': isDragging === side }"
        @dragenter.prevent="isDragging = side"
        @dragover.prevent
        @dragleave.self="isDragging = null"
        @drop.prevent="dropFile(side, $event)"
      >
        <header class="editor-header">
          <div class="editor-title">
            <span class="side-badge" :class="side === 'left' ? 'side-a' : 'side-b'">{{
              side === 'left' ? 'A' : 'B'
            }}</span>
            <div>
              <strong>{{ side === 'left' ? '原始文本' : '修改后文本' }}</strong>
              <span
                >{{ side === 'left' ? leftLineCount : rightLineCount }} 行 ·
                {{ side === 'left' ? leftText.length : rightText.length }} 字符</span
              >
            </div>
          </div>
          <div class="editor-actions">
            <label class="text-action">
              导入
              <input type="file" accept="text/*,.json,.md,.xml,.csv,.log" @change="selectFile(side, $event)" />
            </label>
            <button class="text-action" type="button" @click="downloadText(side)">保存</button>
            <button class="text-action danger" type="button" @click="clearSide(side)">清空</button>
          </div>
        </header>
        <textarea
          v-if="side === 'left'"
          v-model="leftText"
          spellcheck="false"
          aria-label="原始文本"
          placeholder="粘贴原始文本，或将文本文件拖到这里…"
        />
        <textarea
          v-else
          v-model="rightText"
          spellcheck="false"
          aria-label="修改后文本"
          placeholder="粘贴修改后的文本，或将文本文件拖到这里…"
        />
      </article>
    </section>

    <section class="result-card" aria-live="polite">
      <header class="result-header">
        <div>
          <p class="eyebrow">COMPARE RESULT</p>
          <h2>对比结果</h2>
        </div>
        <div v-if="hasText" class="result-tools">
          <div class="stats" aria-label="差异统计">
            <span class="stat added">+{{ diffResult.stats.added }} 新增</span>
            <span class="stat changed">~{{ diffResult.stats.changed }} 修改</span>
            <span class="stat removed">−{{ diffResult.stats.deleted }} 删除</span>
          </div>
          <div class="diff-navigation">
            <span>{{ differenceRows.length ? activeDifference + 1 : 0 }}/{{ differenceRows.length }} 处</span>
            <button type="button" aria-label="上一处差异" @click="jumpToDifference(-1)">↑</button>
            <button type="button" aria-label="下一处差异" @click="jumpToDifference(1)">↓</button>
          </div>
        </div>
      </header>

      <div v-if="!hasText" class="empty-state">
        <span class="empty-icon" aria-hidden="true">≠</span><strong>等待输入文本</strong>
        <p>在上方任意一侧输入内容后，将自动显示逐行差异。</p>
      </div>
      <div v-else-if="differenceRows.length === 0" class="empty-state success-state">
        <span class="empty-icon" aria-hidden="true">✓</span><strong>两侧文本完全一致</strong>
        <p>没有发现新增、修改或删除的内容。</p>
      </div>
      <div v-else class="diff-table" role="table" aria-label="逐行差异">
        <div class="diff-table-head" role="row">
          <div role="columnheader">A · 原始文本</div>
          <div role="columnheader">B · 修改后文本</div>
        </div>
        <div
          v-for="({ row, index: rowIndex }, differenceIndex) in differenceRows"
          :key="`${rowIndex}-${row.leftLineNumber}-${row.rightLineNumber}`"
          class="diff-row"
          :class="{ 'is-active': differenceIndex === activeDifference }"
          :data-diff-index="differenceIndex"
          role="row"
        >
          <div v-for="side in sides" :key="side" class="diff-line" :class="lineClass(row, side)" role="cell">
            <span class="line-number">{{ (side === 'left' ? row.leftLineNumber : row.rightLineNumber) ?? '·' }}</span>
            <code
              ><span
                v-for="(segment, segmentIndex) in side === 'left' ? row.leftSegments : row.rightSegments"
                :key="segmentIndex"
                :class="`segment-${segment.type}`"
                >{{ segment.text }}</span
              ></code
            >
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.text-diff-page {
  --diff-border: color-mix(in srgb, var(--border-color) 86%, transparent);
  --diff-surface: color-mix(in srgb, var(--bg-secondary) 92%, transparent);
  min-height: 100%;
  padding: clamp(16px, 2.5vw, 32px);
  color: var(--text-primary);
}
.page-header,
.result-header,
.editor-header,
.editor-title,
.editor-actions,
.header-actions,
.result-tools,
.stats,
.diff-navigation {
  display: flex;
  align-items: center;
}
.page-header {
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 22px;
}
.eyebrow {
  margin: 0 0 5px;
  color: var(--accent-color);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.16em;
}
h1,
h2,
.subtitle {
  margin: 0;
}
h1 {
  font-size: clamp(26px, 3vw, 38px);
  line-height: 1.15;
  letter-spacing: -0.035em;
}
h2 {
  font-size: 18px;
}
.subtitle {
  margin-top: 7px;
  color: var(--text-secondary);
  font-size: 14px;
}
.header-actions,
.editor-actions,
.stats,
.diff-navigation {
  gap: 8px;
}
.button,
.text-action,
.diff-navigation button {
  border: 0;
  cursor: pointer;
  font: inherit;
}
.button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 11px;
  font-size: 13px;
  font-weight: 700;
}
.button-primary {
  color: #fff;
  background: linear-gradient(135deg, var(--accent-color), #6366f1);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent-color) 28%, transparent);
}
.button-secondary {
  color: var(--text-primary);
  background: var(--diff-surface);
  border: 1px solid var(--diff-border);
}
.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.editor-card,
.result-card {
  overflow: hidden;
  background: var(--diff-surface);
  border: 1px solid var(--diff-border);
  border-radius: 16px;
  box-shadow: 0 16px 44px rgba(15, 23, 42, 0.08);
}
.editor-card {
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}
.editor-card:focus-within,
.editor-card.is-dragging {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-color) 16%, transparent);
}
.editor-header {
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 10px 13px;
  border-bottom: 1px solid var(--diff-border);
}
.editor-title {
  min-width: 0;
  gap: 10px;
}
.editor-title div {
  display: grid;
  gap: 2px;
}
.editor-title strong {
  font-size: 13px;
}
.editor-title div > span {
  color: var(--text-secondary);
  font-size: 11px;
}
.side-badge {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 900;
}
.side-a {
  color: #e11d48;
  background: rgba(244, 63, 94, 0.12);
}
.side-b {
  color: #059669;
  background: rgba(16, 185, 129, 0.13);
}
.text-action {
  position: relative;
  padding: 5px 7px;
  color: var(--text-secondary);
  background: transparent;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 650;
}
.text-action:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
}
.text-action.danger:hover {
  color: #e11d48;
  background: rgba(244, 63, 94, 0.1);
}
.text-action input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
textarea {
  display: block;
  width: 100%;
  min-height: 260px;
  padding: 16px 18px;
  resize: vertical;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-primary) 38%, transparent);
  border: 0;
  outline: 0;
  font:
    13px/1.75 ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
  tab-size: 2;
  white-space: pre;
}
textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.65;
}
.result-card {
  margin-top: 14px;
}
.result-header {
  justify-content: space-between;
  gap: 18px;
  min-height: 70px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--diff-border);
}
.result-tools {
  justify-content: flex-end;
  gap: 14px;
}
.stat {
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 750;
}
.stat.added {
  color: #047857;
  background: rgba(16, 185, 129, 0.13);
}
.stat.changed {
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
}
.stat.removed {
  color: #be123c;
  background: rgba(244, 63, 94, 0.12);
}
.diff-navigation {
  color: var(--text-secondary);
  font-size: 11px;
}
.diff-navigation button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
  border-radius: 7px;
}
.empty-state {
  display: grid;
  min-height: 220px;
  place-items: center;
  align-content: center;
  padding: 30px;
  text-align: center;
}
.empty-state p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
}
.empty-icon {
  display: grid;
  width: 46px;
  height: 46px;
  margin-bottom: 12px;
  place-items: center;
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  border-radius: 14px;
  font-size: 23px;
  font-weight: 800;
}
.success-state .empty-icon {
  color: #059669;
  background: rgba(16, 185, 129, 0.13);
}
.diff-table {
  overflow: auto;
  max-height: 520px;
  font:
    12px/1.65 ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;
}
.diff-table-head,
.diff-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(360px, 1fr));
}
.diff-table-head {
  position: sticky;
  z-index: 2;
  top: 0;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--diff-border);
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 700;
}
.diff-table-head > div {
  padding: 8px 13px;
}
.diff-table-head > div + div,
.diff-line + .diff-line {
  border-left: 1px solid var(--diff-border);
}
.diff-row {
  border-bottom: 1px solid color-mix(in srgb, var(--diff-border) 52%, transparent);
}
.diff-row.is-active {
  outline: 2px solid color-mix(in srgb, var(--accent-color) 52%, transparent);
  outline-offset: -2px;
}
.diff-line {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  min-height: 30px;
}
.diff-line.is-removed {
  background: rgba(244, 63, 94, 0.095);
}
.diff-line.is-added {
  background: rgba(16, 185, 129, 0.095);
}
.diff-line.is-empty {
  background-image: repeating-linear-gradient(-45deg, transparent 0 6px, rgba(148, 163, 184, 0.07) 6px 12px);
}
.line-number {
  padding: 5px 10px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-primary) 28%, transparent);
  border-right: 1px solid var(--diff-border);
  text-align: right;
  user-select: none;
}
.diff-line code {
  overflow-wrap: anywhere;
  padding: 5px 10px;
  color: var(--text-primary);
  white-space: pre-wrap;
}
.segment-added,
.segment-removed {
  border-radius: 3px;
  font-weight: 650;
}
.segment-added {
  color: #047857;
  background: rgba(16, 185, 129, 0.24);
}
.segment-removed {
  color: #be123c;
  background: rgba(244, 63, 94, 0.21);
}
@media (prefers-color-scheme: dark) {
  .stat.added,
  .segment-added {
    color: #6ee7b7;
  }
  .stat.changed {
    color: #fcd34d;
  }
  .stat.removed,
  .segment-removed {
    color: #fda4af;
  }
}
@media (max-width: 900px) {
  .page-header,
  .result-header,
  .result-tools {
    align-items: flex-start;
    flex-direction: column;
  }
  .header-actions,
  .result-tools {
    width: 100%;
  }
  .editor-grid {
    grid-template-columns: 1fr;
  }
  textarea {
    min-height: 220px;
  }
}
@media (max-width: 560px) {
  .text-diff-page {
    padding: 12px;
  }
  .page-header {
    margin-bottom: 16px;
  }
  .header-actions .button {
    flex: 1;
    justify-content: center;
  }
  .editor-header,
  .result-tools {
    align-items: flex-start;
  }
  .editor-header,
  .result-tools,
  .stats {
    flex-wrap: wrap;
  }
}
</style>
