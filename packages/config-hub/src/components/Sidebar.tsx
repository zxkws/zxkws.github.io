import { ConfigDocument, SystemConfigDoc } from '../types';

import './Sidebar.css';

interface SidebarProps {
  documents: ConfigDocument[];
  activeId: string;
  onSelect: (_id: string) => void;
  onAdd: (_name?: string) => void;
  onRename: (_id: string, _name: string) => void;
  onDuplicate: (_id: string) => void;
  onDelete: (_id: string) => void;
  onImport: (_payload: { name?: string; description?: string; content: SystemConfigDoc }) => void;
  onExport: (_id: string) => void;
}

const confirmAction = (message: string) => {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.confirm(message);
};

const promptForValue = (message: string, defaultValue = ''): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.prompt(message, defaultValue ?? '');
};

export const Sidebar = ({
  documents,
  activeId,
  onSelect,
  onAdd,
  onRename,
  onDuplicate,
  onDelete,
  onImport,
  onExport,
}: SidebarProps) => {
  const handleCreate = () => {
    const name = promptForValue('新建配置工作区名称', 'New Workspace');
    onAdd(name ?? undefined);
  };

  const handleImport = () => {
    const raw = promptForValue('粘贴要导入的配置 JSON');
    if (!raw) {
      return;
    }
    try {
      const content = JSON.parse(raw);
      const name = promptForValue('为导入的配置命名', 'Imported Workspace') || undefined;
      const description = promptForValue('描述 (可选)', '') || undefined;
      onImport({ content, name, description });
    } catch (error) {
      alert(`无法解析配置: ${(error as Error).message}`);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div>
          <h1>Config Hub</h1>
          <p>集中管理各类微应用配置</p>
        </div>
        <div className="sidebar-actions">
          <button onClick={handleCreate}>新建</button>
          <button onClick={handleImport}>导入</button>
        </div>
      </div>
      <nav className="sidebar-list">
        {documents.map((doc) => {
          const isActive = doc.id === activeId;
          return (
            <div key={doc.id} className={`sidebar-item ${isActive ? 'active' : ''}`}>
              <button className="sidebar-item-button" onClick={() => onSelect(doc.id)}>
                <span className="name">{doc.name}</span>
                <span className="meta">{new Date(doc.updatedAt).toLocaleString()}</span>
              </button>
              <div className="sidebar-item-tools">
                <button
                  title="重命名"
                  onClick={() => {
                    const value = promptForValue('重命名配置', doc.name);
                    if (value) {
                      onRename(doc.id, value);
                    }
                  }}
                >
                  重命名
                </button>
                <button title="复制" onClick={() => onDuplicate(doc.id)}>
                  复制
                </button>
                <button title="导出" onClick={() => onExport(doc.id)}>
                  导出
                </button>
                <button
                  title="删除"
                  onClick={() => {
                    if (confirmAction('确定要删除该配置吗？')) {
                      onDelete(doc.id);
                    }
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
