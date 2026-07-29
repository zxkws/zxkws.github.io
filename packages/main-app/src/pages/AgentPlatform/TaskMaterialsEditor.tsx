import { message } from 'antd';
import { useRef } from 'react';

export type TaskMaterialDraft = {
  id: string;
  key: string;
  label: string;
  value: string;
};

type TaskMaterialsEditorProps = {
  value: TaskMaterialDraft[];
  onChange: (value: TaskMaterialDraft[]) => void;
};

const newMaterial = (): TaskMaterialDraft => ({
  id:
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  key: `material_${Date.now()}`,
  label: '参考资料',
  value: '',
});

const supportedTextFile =
  '.txt,.md,.markdown,.json,.jsonl,.csv,.tsv,.yaml,.yml,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.go,.rs,.sql,.log';

export default function TaskMaterialsEditor({ value, onChange }: TaskMaterialsEditorProps) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const update = (id: string, patch: Partial<TaskMaterialDraft>) => {
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const add = () => onChange([...value, newMaterial()]);
  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 20_000) {
      message.warning('单份任务资料最多 20,000 字节；大文档请先导入知识库');
      return;
    }
    const content = await file.text();
    const item = newMaterial();
    item.key = `file_${Date.now()}`;
    item.label = file.name;
    item.value = content;
    onChange([...value, item]);
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div className="agent-material-editor">
      <div className="workspace-panel__header">
        <div>
          <h3>任务资料</h3>
          <p className="workspace-panel__meta">可添加链接、约束和文本文件；PDF、Word 等大文档请从知识库选择。</p>
        </div>
        <div className="workspace-inline-actions">
          <button type="button" className="workspace-button" onClick={add}>
            添加资料
          </button>
          <button type="button" className="workspace-button" onClick={() => fileInput.current?.click()}>
            读取文本文件
          </button>
          <input
            ref={fileInput}
            className="agent-material-editor__file"
            type="file"
            accept={supportedTextFile}
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
        </div>
      </div>
      {value.length ? (
        <div className="agent-material-list">
          {value.map((item) => (
            <article key={item.id}>
              <div className="agent-material-list__meta">
                <label className="workspace-field">
                  key
                  <input
                    className="workspace-input workspace-input--mono"
                    value={item.key}
                    maxLength={80}
                    onChange={(event) => update(item.id, { key: event.target.value })}
                  />
                </label>
                <label className="workspace-field">
                  名称
                  <input
                    className="workspace-input"
                    value={item.label}
                    maxLength={200}
                    onChange={(event) => update(item.id, { label: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="workspace-button workspace-button--danger agent-material-list__remove"
                  onClick={() => onChange(value.filter((row) => row.id !== item.id))}
                >
                  删除
                </button>
              </div>
              <label className="workspace-field">
                内容
                <textarea
                  className="workspace-textarea"
                  value={item.value}
                  maxLength={20_000}
                  onChange={(event) => update(item.id, { value: event.target.value })}
                />
              </label>
            </article>
          ))}
        </div>
      ) : (
        <p className="studio-empty">暂无附加资料。规划器仍会根据任务主动询问缺失内容。</p>
      )}
    </div>
  );
}
