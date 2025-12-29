import { useMemo, useState } from 'react';
import clsx from 'clsx';

import type { ContextItem, ContextScope, ContextTemplate } from '../types';

type ContextPanelProps = {
  open: boolean;
  sessionItems: ContextItem[];
  fileItems: ContextItem[];
  projectItems: ContextItem[];
  templates: ContextTemplate[];
  budgetChars: number;
  lastOmitted?: number;
  onClose: () => void;
  onAddItem: (scope: ContextScope, title: string, content: string) => void;
  onTogglePin: (scope: ContextScope, id: string) => void;
  onDeleteItem: (scope: ContextScope, id: string) => void;
  onSaveTemplate: (name: string) => void;
  onApplyTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
};

const scopeOptions: Array<{ value: ContextScope; label: string }> = [
  { value: 'session', label: '会话' },
  { value: 'file', label: '文件' },
  { value: 'project', label: '项目' },
];

const estimateChars = (items: ContextItem[]) =>
  items.reduce((sum, item) => sum + item.title.length + item.content.length + 12, 0);

const renderScope = (scope: ContextScope) => {
  if (scope === 'session') return '会话上下文';
  if (scope === 'file') return '文件上下文';
  return '项目上下文';
};

const ItemRow = ({
  item,
  scope,
  onTogglePin,
  onDelete,
}: {
  item: ContextItem;
  scope: ContextScope;
  onTogglePin: () => void;
  onDelete: () => void;
}) => {
  const preview = useMemo(() => item.content.trim().slice(0, 120), [item.content]);

  return (
    <div className={clsx('context-item', item.pinned && 'pinned')}>
      <div className="context-item-main">
        <div className="context-item-title">
          <strong>{item.title.trim() || '未命名上下文'}</strong>
          <span className="hint-text">{scope}</span>
        </div>
        {preview && <div className="context-item-preview">{preview}</div>}
      </div>
      <div className="context-item-actions">
        <button type="button" className="secondary-button" onClick={onTogglePin} title="置顶/取消置顶">
          {item.pinned ? '取消置顶' : '置顶'}
        </button>
        <button type="button" className="secondary-button" onClick={onDelete} title="删除">
          删除
        </button>
      </div>
    </div>
  );
};

export default function ContextPanel({
  open,
  sessionItems,
  fileItems,
  projectItems,
  templates,
  budgetChars,
  lastOmitted,
  onClose,
  onAddItem,
  onTogglePin,
  onDeleteItem,
  onSaveTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}: ContextPanelProps) {
  const [draftScope, setDraftScope] = useState<ContextScope>('session');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');

  const totalEstimatedChars = useMemo(
    () => estimateChars(sessionItems) + estimateChars(fileItems) + estimateChars(projectItems),
    [sessionItems, fileItems, projectItems],
  );
  const overBudget = totalEstimatedChars > budgetChars;

  const handleAdd = () => {
    const title = draftTitle.trim();
    const content = draftContent.trim();
    if (!content) {
      return;
    }
    onAddItem(draftScope, title, content);
    setDraftTitle('');
    setDraftContent('');
  };

  const handleSaveTemplate = () => {
    const name = window.prompt('模板名称（用于复用会话上下文）');
    if (!name) {
      return;
    }
    onSaveTemplate(name.trim());
  };

  return (
    <>
      {open && <div className="context-overlay" onClick={onClose} />}
      <aside className={clsx('context-panel', open && 'is-open')} aria-hidden={!open}>
        <div className="context-panel-header">
          <div>
            <div style={{ fontWeight: 700 }}>上下文管理</div>
            <div className="hint-text">预算：约 {budgetChars} 字符（近似 token）</div>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="context-panel-content">
          {overBudget && (
            <div className="alert warning">
              当前上下文估算约 {totalEstimatedChars} 字符，已超过预算；发起请求时会自动裁剪。
            </div>
          )}
          {typeof lastOmitted === 'number' && lastOmitted > 0 && (
            <div className="alert warning">上一次请求已裁剪 {lastOmitted} 条上下文（为满足预算）。</div>
          )}

          <section className="context-section">
            <div className="context-section-header">
              <h4>新增上下文</h4>
            </div>
            <div className="context-form">
              <label>
                <span className="hint-text">范围</span>
                <select value={draftScope} onChange={(event) => setDraftScope(event.target.value as ContextScope)}>
                  {scopeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="hint-text">标题（可选）</span>
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="例如：项目约束" />
              </label>
              <label>
                <span className="hint-text">内容</span>
                <textarea
                  rows={5}
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  placeholder="粘贴代码片段、规范、需求描述等"
                />
              </label>
              <button type="button" className="primary-button" onClick={handleAdd}>
                添加
              </button>
            </div>
          </section>

          <section className="context-section">
            <div className="context-section-header">
              <h4>会话模板</h4>
              <button type="button" className="secondary-button" onClick={handleSaveTemplate}>
                保存当前会话为模板
              </button>
            </div>
            {templates.length === 0 ? (
              <div className="hint-text">暂无模板，可将常用上下文保存以便一键复用。</div>
            ) : (
              <div className="template-list">
                {templates.map((tpl) => (
                  <div key={tpl.id} className="template-item">
                    <div>
                      <strong>{tpl.name}</strong>
                      <div className="hint-text">包含 {tpl.items.length} 条上下文</div>
                    </div>
                    <div className="template-actions">
                      <button type="button" className="secondary-button" onClick={() => onApplyTemplate(tpl.id)}>
                        应用
                      </button>
                      <button type="button" className="secondary-button" onClick={() => onDeleteTemplate(tpl.id)}>
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {(
            [
              { scope: 'session' as const, items: sessionItems },
              { scope: 'file' as const, items: fileItems },
              { scope: 'project' as const, items: projectItems },
            ] as Array<{ scope: ContextScope; items: ContextItem[] }>
          ).map(({ scope, items }) => (
            <section key={scope} className="context-section">
              <div className="context-section-header">
                <h4>{renderScope(scope)}</h4>
                <span className="hint-text">{items.length} 条</span>
              </div>
              {items.length === 0 ? (
                <div className="hint-text">暂无内容，可在上方新增。</div>
              ) : (
                <div className="context-list">
                  {items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      scope={scope}
                      onTogglePin={() => onTogglePin(scope, item.id)}
                      onDelete={() => onDeleteItem(scope, item.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </aside>
    </>
  );
}

