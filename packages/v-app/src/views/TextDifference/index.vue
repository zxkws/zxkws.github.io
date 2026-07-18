<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { buildTextDiff, type DiffRow } from './diff';
import './styles.css';

type Side = 'left' | 'right';
type ViewMode = 'edit' | 'diff';

const sides: Side[] = ['left', 'right'];
const leftText = ref('');
const rightText = ref('');
const viewMode = ref<ViewMode>('edit');
const showOnlyChanges = ref(false);
const wrapLines = ref(false);
const isDragging = ref<Side | null>(null);
const activeDifference = ref(0);
const diffResult = ref(buildTextDiff('', ''));
let compareTimer: ReturnType<typeof setTimeout> | undefined;

const hasText = computed(() => leftText.value !== '' || rightText.value !== '');
const hasDifferences = computed(() => diffResult.value.rows.some((row) => row.type !== 'equal'));
const differenceRows = computed(() =>
  diffResult.value.rows.map((row, index) => ({ row, index })).filter(({ row }) => row.type !== 'equal'),
);
const visibleRows = computed(() =>
  diffResult.value.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => !showOnlyChanges.value || row.type !== 'equal'),
);
const activeRowIndex = computed(() => differenceRows.value[activeDifference.value]?.index ?? -1);

const lineCount = (text: string) => (text === '' ? 0 : text.split('\n').length);
const lineNumbers = (text: string) => Array.from({ length: lineCount(text) }, (_, index) => index + 1);

const compare = () => {
  diffResult.value = buildTextDiff(leftText.value, rightText.value);
  if (activeDifference.value >= differenceRows.value.length) activeDifference.value = 0;
};

watch(
  [leftText, rightText],
  () => {
    if (compareTimer) clearTimeout(compareTimer);
    compareTimer = setTimeout(compare, 160);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (compareTimer) clearTimeout(compareTimer);
});

const setView = (mode: ViewMode) => {
  compare();
  viewMode.value = mode;
};

const swapTexts = () => {
  [leftText.value, rightText.value] = [rightText.value, leftText.value];
};

const copySide = (from: Side) => {
  if (from === 'left') rightText.value = leftText.value;
  else leftText.value = rightText.value;
};

const clearSide = (side: Side) => {
  if (side === 'left') leftText.value = '';
  else rightText.value = '';
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

const downloadText = (side: Side) => {
  const content = side === 'left' ? leftText.value : rightText.value;
  const objectUrl = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = side === 'left' ? '原始文本.txt' : '修改后文本.txt';
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const syncLineNumbers = (event: Event) => {
  const textarea = event.target as HTMLTextAreaElement;
  const gutter = textarea.parentElement?.querySelector<HTMLElement>('.editor-line-numbers');
  if (gutter) gutter.scrollTop = textarea.scrollTop;
};

const jumpToDifference = async (direction: -1 | 1) => {
  const count = differenceRows.value.length;
  if (!count) return;
  activeDifference.value = (activeDifference.value + direction + count) % count;
  await nextTick();
  document
    .querySelector(`[data-row-index="${activeRowIndex.value}"]`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const mergeRow = (rowIndex: number, sourceSide: Side) => {
  const row = diffResult.value.rows[rowIndex];
  const targetSide: Side = sourceSide === 'left' ? 'right' : 'left';
  const sourceLineNumber = sourceSide === 'left' ? row.leftLineNumber : row.rightLineNumber;
  const targetLineNumber = targetSide === 'left' ? row.leftLineNumber : row.rightLineNumber;
  const sourceText = sourceSide === 'left' ? row.leftText : row.rightText;
  const targetText = targetSide === 'left' ? leftText.value : rightText.value;
  const targetLines = targetText === '' ? [] : targetText.split('\n');
  const targetLinesBefore = diffResult.value.rows
    .slice(0, rowIndex)
    .filter((item) => (targetSide === 'left' ? item.leftLineNumber : item.rightLineNumber) !== null).length;

  if (sourceLineNumber === null && targetLineNumber !== null) {
    targetLines.splice(targetLineNumber - 1, 1);
  } else if (sourceLineNumber !== null && targetLineNumber === null) {
    targetLines.splice(targetLinesBefore, 0, sourceText);
  } else if (sourceLineNumber !== null && targetLineNumber !== null) {
    targetLines[targetLineNumber - 1] = sourceText;
  }

  if (targetSide === 'left') leftText.value = targetLines.join('\n');
  else rightText.value = targetLines.join('\n');
};

const rowClass = (row: DiffRow, side: Side) => ({
  'is-empty': side === 'left' ? row.leftLineNumber === null : row.rightLineNumber === null,
  'is-added': side === 'right' && (row.type === 'added' || row.type === 'changed'),
  'is-removed': side === 'left' && (row.type === 'removed' || row.type === 'changed'),
});
</script>

<template>
  <main class="diff-workbench">
    <header class="diff-commandbar">
      <div class="diff-brand">
        <span class="diff-brand-mark">≠</span>
        <div><strong>文本对比</strong><span>本地处理 · 内容不上传</span></div>
      </div>

      <div class="segmented" aria-label="视图模式">
        <button :class="{ active: viewMode === 'edit' }" type="button" @click="setView('edit')">双栏编辑</button>
        <button :class="{ active: viewMode === 'diff' }" type="button" @click="setView('diff')">差异视图</button>
      </div>

      <div class="diff-command-actions">
        <button class="tool-button" type="button" @click="swapTexts">⇄ 交换</button>
        <label class="tool-toggle"><input v-model="wrapLines" type="checkbox" />自动换行</label>
        <label v-if="viewMode === 'diff'" class="tool-toggle">
          <input v-model="showOnlyChanges" type="checkbox" />仅看差异
        </label>
        <button class="primary-action" type="button" @click="setView('diff')">开始对比</button>
      </div>
    </header>

    <section v-if="viewMode === 'edit'" class="editor-workspace">
      <article
        v-for="side in sides"
        :key="side"
        class="source-pane"
        :class="{ 'is-dragging': isDragging === side }"
        @dragenter.prevent="isDragging = side"
        @dragover.prevent
        @dragleave.self="isDragging = null"
        @drop.prevent="dropFile(side, $event)"
      >
        <header class="source-pane-header">
          <div class="source-title">
            <span :class="side === 'left' ? 'source-a' : 'source-b'">{{ side === 'left' ? 'A' : 'B' }}</span>
            <strong>{{ side === 'left' ? '原始文本' : '修改后文本' }}</strong>
            <small>
              {{ lineCount(side === 'left' ? leftText : rightText) }} 行 ·
              {{ (side === 'left' ? leftText : rightText).length }} 字符
            </small>
          </div>
          <div class="pane-actions">
            <label class="pane-action file-action"
              >打开文件<input type="file" accept="text/*,.json,.md,.xml,.csv,.log" @change="selectFile(side, $event)"
            /></label>
            <button class="pane-action" type="button" @click="copySide(side)">
              {{ side === 'left' ? '复制到 B' : '复制到 A' }}
            </button>
            <button class="pane-action" type="button" @click="downloadText(side)">保存</button>
            <button class="pane-action danger" type="button" @click="clearSide(side)">清空</button>
          </div>
        </header>
        <div class="source-editor">
          <div class="editor-line-numbers" aria-hidden="true">
            <span v-for="line in lineNumbers(side === 'left' ? leftText : rightText)" :key="line">{{ line }}</span>
          </div>
          <textarea
            v-if="side === 'left'"
            v-model="leftText"
            :class="{ 'wrap-lines': wrapLines }"
            aria-label="原始文本"
            placeholder="粘贴原始文本，或拖入文件…"
            spellcheck="false"
            @scroll="syncLineNumbers"
          />
          <textarea
            v-else
            v-model="rightText"
            :class="{ 'wrap-lines': wrapLines }"
            aria-label="修改后文本"
            placeholder="粘贴修改后的文本，或拖入文件…"
            spellcheck="false"
            @scroll="syncLineNumbers"
          />
        </div>
      </article>
    </section>

    <section v-else class="compare-workspace">
      <header class="compare-summary">
        <div class="compare-state">
          <span v-if="!hasText">等待输入</span>
          <span v-else-if="!hasDifferences" class="same-text">✓ 两侧内容一致</span>
          <template v-else>
            <span class="summary-pill removed">− {{ diffResult.stats.deleted }} 删除</span>
            <span class="summary-pill changed">~ {{ diffResult.stats.changed }} 修改</span>
            <span class="summary-pill added">+ {{ diffResult.stats.added }} 新增</span>
          </template>
        </div>
        <div class="difference-nav">
          <span>{{ differenceRows.length ? activeDifference + 1 : 0 }} / {{ differenceRows.length }} 处差异</span>
          <button type="button" aria-label="上一处差异" @click="jumpToDifference(-1)">↑</button>
          <button type="button" aria-label="下一处差异" @click="jumpToDifference(1)">↓</button>
          <button type="button" @click="setView('edit')">继续编辑</button>
        </div>
      </header>

      <div v-if="!hasText" class="workbench-empty">
        <b>粘贴两段文本开始比较</b><span>支持普通文本、代码、日志和配置文件</span>
      </div>
      <div v-else-if="!hasDifferences" class="workbench-empty success">
        <b>没有发现差异</b><span>两侧文本逐字一致</span>
      </div>
      <div v-else class="diff-grid" :class="{ 'wrap-lines': wrapLines }" role="table" aria-label="文本差异">
        <div class="diff-grid-header" role="row">
          <div role="columnheader">A · 原始文本</div>
          <div aria-hidden="true"></div>
          <div role="columnheader">B · 修改后文本</div>
        </div>
        <div
          v-for="{ row, index: rowIndex } in visibleRows"
          :key="`${rowIndex}-${row.leftLineNumber}-${row.rightLineNumber}`"
          class="comparison-row"
          :class="{ 'is-current': rowIndex === activeRowIndex, 'is-unchanged': row.type === 'equal' }"
          :data-row-index="rowIndex"
          role="row"
        >
          <div class="comparison-line" :class="rowClass(row, 'left')" role="cell">
            <span class="diff-line-number">{{ row.leftLineNumber ?? '·' }}</span>
            <code
              ><span v-for="(segment, index) in row.leftSegments" :key="index" :class="`segment-${segment.type}`">{{
                segment.text
              }}</span></code
            >
          </div>
          <div class="merge-actions" aria-label="合并此行">
            <template v-if="row.type !== 'equal'">
              <button type="button" title="使用 A 的内容" @click="mergeRow(rowIndex, 'left')">→</button>
              <button type="button" title="使用 B 的内容" @click="mergeRow(rowIndex, 'right')">←</button>
            </template>
          </div>
          <div class="comparison-line" :class="rowClass(row, 'right')" role="cell">
            <span class="diff-line-number">{{ row.rightLineNumber ?? '·' }}</span>
            <code
              ><span v-for="(segment, index) in row.rightSegments" :key="index" :class="`segment-${segment.type}`">{{
                segment.text
              }}</span></code
            >
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
