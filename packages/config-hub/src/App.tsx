import { useCallback, useMemo, useState } from 'react';
import { useDocuments } from './hooks/useDocuments';
import { Sidebar } from './components/Sidebar';
import { Workspace } from './components/Workspace';
import { SystemConfigDoc } from './types';
import './App.css';

const notify = (message: string) => {
  console.warn(message);
};

const App = () => {
  const {
    documents,
    activeDocument,
    activeId,
    selectDocument,
    addDocument,
    updateDocument,
    renameDocument,
    duplicateDocument,
    removeDocument,
    importDocument,
    exportDocument,
  } = useDocuments();

  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = useCallback(
    (payload: { name?: string; description?: string; content: SystemConfigDoc }) => {
      try {
        importDocument(payload);
        setImportError(null);
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Unknown import error');
      }
    },
    [importDocument],
  );

  const handleExport = useCallback(
    (id: string) => {
      const json = exportDocument(id);
      if (!json) {
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(json).then(() => notify('Configuration copied to clipboard'));
      }
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${Date.now()}-config.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [exportDocument],
  );

  const workspaceProps = useMemo(() => {
    if (!activeDocument) {
      return null;
    }
    return {
      document: activeDocument,
      onUpdate: (_updater: (_doc: SystemConfigDoc) => SystemConfigDoc) => {
        updateDocument(activeDocument.id, _updater);
      },
    };
  }, [activeDocument, updateDocument]);

  return (
    <div className="app-shell app-root">
      <Sidebar
        documents={documents}
        activeId={activeId}
        onSelect={selectDocument}
        onAdd={addDocument}
        onRename={renameDocument}
        onDuplicate={duplicateDocument}
        onDelete={removeDocument}
        onImport={handleImport}
        onExport={handleExport}
      />
      <main className="workspace">
        {!workspaceProps ? (
          <div className="workspace-empty">
            <h2>选择或创建一个配置工作区</h2>
            <p>使用左侧侧边栏来导入、复制或创建新的配置集合。</p>
          </div>
        ) : (
          <Workspace {...workspaceProps} key={workspaceProps.document.id} />
        )}
        {importError && <div className="toast toast-error">导入失败：{importError}</div>}
      </main>
    </div>
  );
};

export default App;
