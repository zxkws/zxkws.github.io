import { useMemo } from 'react';
import type { RefObject } from 'react';
import clsx from 'clsx';

export type WorkspaceCodeBlock = {
  id: string;
  language?: string;
  content: string;
  messageId: string;
  messageRole: string;
  createdAt: string;
};

export type WorkspaceDiff = {
  before: string;
  after: string;
  selectionStart: number;
  selectionEnd: number;
};

type WorkspacePanelProps = {
  open: boolean;
  code: string;
  language: string;
  codeBlocks: WorkspaceCodeBlock[];
  diff: WorkspaceDiff | null;
  isRefactoring: boolean;
  errorMessage: string | null;
  canRollback: boolean;
  textareaRef: RefObject<HTMLTextAreaElement>;
  onClose: () => void;
  onCodeChange: (value: string) => void;
  onImportBlock: (blockId: string) => void;
  onRefactorSelection: () => void;
  onApplyDiff: () => void;
  onClearDiff: () => void;
  onRollback: () => void;
};

const renderLabel = (block: WorkspaceCodeBlock) =>
  `${block.language ? block.language : 'plain'} · ${block.messageRole} · ${new Date(block.createdAt).toLocaleTimeString('zh-CN')}`;

export default function WorkspacePanel({
  open,
  code,
  language,
  codeBlocks,
  diff,
  isRefactoring,
  errorMessage,
  canRollback,
  textareaRef,
  onClose,
  onCodeChange,
  onImportBlock,
  onRefactorSelection,
  onApplyDiff,
  onClearDiff,
  onRollback,
}: WorkspacePanelProps) {
  const blocks = useMemo(() => codeBlocks.slice(0, 20), [codeBlocks]);

  const selectionHint = useMemo(() => {
    const el = textareaRef.current;
    if (!el) {
      return '在编辑器中选择一段代码，然后点击「重构选区」。';
    }
    if (el.selectionStart === el.selectionEnd) {
      return '在编辑器中选择一段代码，然后点击「重构选区」。';
    }
    return `已选择 ${Math.abs(el.selectionEnd - el.selectionStart)} 字符，点击「重构选区」将仅处理选中内容。`;
  }, [textareaRef]);

  return (
    <>
      {open && <div className="workspace-overlay" onClick={onClose} />}
      <aside className={clsx('workspace-panel', open && 'is-open')} aria-hidden={!open}>
        <div className="workspace-panel-header">
          <div>
            <div style={{ fontWeight: 700 }}>代码工作区</div>
            <div className="hint-text">{selectionHint}</div>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="workspace-panel-content">
          {errorMessage && <div className="alert error">{errorMessage}</div>}

          <section className="workspace-section">
            <div className="workspace-section-header">
              <h4>编辑器</h4>
              <span className="hint-text">{language ? language : 'plain'}</span>
            </div>
            <div className="workspace-editor">
              <textarea
                ref={textareaRef}
                rows={14}
                value={code}
                onChange={(event) => onCodeChange(event.target.value)}
                placeholder="导入代码块或粘贴代码到这里…"
              />
              <div className="workspace-actions">
                <button type="button" className="primary-button" onClick={onRefactorSelection} disabled={isRefactoring}>
                  {isRefactoring ? '重构中…' : '重构选区'}
                </button>
                <button type="button" className="secondary-button" onClick={onRollback} disabled={!canRollback}>
                  回滚
                </button>
              </div>
            </div>
          </section>

          {diff && (
            <section className="workspace-section">
              <div className="workspace-section-header">
                <h4>Diff 预览（Before / After）</h4>
                <button type="button" className="secondary-button" onClick={onClearDiff}>
                  关闭预览
                </button>
              </div>
              <div className="diff-grid">
                <label>
                  <span className="hint-text">Before</span>
                  <textarea rows={10} value={diff.before} readOnly />
                </label>
                <label>
                  <span className="hint-text">After</span>
                  <textarea rows={10} value={diff.after} readOnly />
                </label>
              </div>
              <div className="workspace-actions">
                <button type="button" className="primary-button" onClick={onApplyDiff}>
                  Apply
                </button>
                <button type="button" className="secondary-button" onClick={onRollback} disabled={!canRollback}>
                  Rollback
                </button>
              </div>
            </section>
          )}

          <section className="workspace-section">
            <div className="workspace-section-header">
              <h4>可导入代码块</h4>
              <span className="hint-text">最近 {blocks.length} 个</span>
            </div>
            {blocks.length === 0 ? (
              <div className="hint-text">暂无可识别的代码块（仅支持 ``` fenced code block）。</div>
            ) : (
              <div className="workspace-block-list">
                {blocks.map((block) => (
                  <div key={block.id} className="workspace-block-item">
                    <div className="workspace-block-meta">
                      <strong>{renderLabel(block)}</strong>
                      <div className="hint-text">{block.content.split('\\n')[0]?.slice(0, 80)}</div>
                    </div>
                    <button type="button" className="secondary-button" onClick={() => onImportBlock(block.id)}>
                      导入
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
