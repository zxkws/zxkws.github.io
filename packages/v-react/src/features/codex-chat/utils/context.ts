import type { ContextItem, ContextScope } from '../types';

export const DEFAULT_CONTEXT_BUDGET_CHARS = 6000;

const scopeLabel: Record<ContextScope, string> = {
  session: '会话上下文',
  file: '文件上下文',
  project: '项目上下文',
};

const scopeOrder: ContextScope[] = ['session', 'file', 'project'];

const sortContextItems = (items: ContextItem[]) =>
  [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });

const formatContextItem = (item: ContextItem) => {
  const title = item.title.trim() || '未命名上下文';
  const content = item.content.trim();
  if (!content) {
    return null;
  }
  return `### ${title}\n${content}`;
};

export type ContextPromptBuildResult = {
  prompt: string | null;
  budgetChars: number;
  usedChars: number;
  omitted: number;
  totalItems: number;
  includedItems: number;
};

type BuildContextPromptOptions = {
  itemsByScope: Record<ContextScope, ContextItem[]>;
  budgetChars: number;
};

export const buildContextPrompt = ({ itemsByScope, budgetChars }: BuildContextPromptOptions): ContextPromptBuildResult => {
  const normalizedBudget = Number.isFinite(budgetChars) && budgetChars > 0 ? Math.floor(budgetChars) : DEFAULT_CONTEXT_BUDGET_CHARS;

  let omitted = 0;
  let includedItems = 0;
  const blocks: string[] = [];

  const intro =
    '你将获得额外上下文（可能被裁剪）。这些内容不一定与用户问题相关；请按需使用，并优先遵循用户最新指令。';
  let usedChars = intro.length + 2;

  blocks.push(intro, '');

  for (const scope of scopeOrder) {
    const items = sortContextItems(itemsByScope[scope] ?? []);
    const rendered = items.map(formatContextItem).filter((item): item is string => Boolean(item));
    if (rendered.length === 0) {
      continue;
    }

    const header = `== ${scopeLabel[scope]} ==`;
    if (usedChars + header.length + 2 > normalizedBudget) {
      omitted += rendered.length;
      continue;
    }
    blocks.push(header);
    usedChars += header.length + 1;

    for (const entry of rendered) {
      const segment = `${entry}\n`;
      if (usedChars + segment.length + 1 > normalizedBudget) {
        omitted += 1;
        continue;
      }
      blocks.push(segment.trimEnd());
      usedChars += segment.length;
      includedItems += 1;
    }

    blocks.push('');
    usedChars += 1;
  }

  const totalItems = scopeOrder.reduce((sum, scope) => sum + (itemsByScope[scope]?.length ?? 0), 0);
  const hasAny = includedItems > 0;

  if (!hasAny) {
    return {
      prompt: null,
      budgetChars: normalizedBudget,
      usedChars: 0,
      omitted: totalItems,
      totalItems,
      includedItems: 0,
    };
  }

  if (omitted > 0) {
    const tail = `[提示] 已因上下文预算裁剪，忽略 ${omitted} 条上下文。`;
    if (usedChars + tail.length + 1 <= normalizedBudget) {
      blocks.push(tail);
      usedChars += tail.length;
    }
  }

  const prompt = blocks.join('\n').trim();
  return {
    prompt,
    budgetChars: normalizedBudget,
    usedChars: prompt.length,
    omitted,
    totalItems,
    includedItems,
  };
};

