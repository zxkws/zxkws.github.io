import { useEffect, useState } from 'react';
import { knowledgeApi, type KnowledgeBase, type KnowledgeDocument } from '../assistants/api';
import '../assistants/styles.css';

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

export default function KnowledgeBasesApp() {
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [editing, setEditing] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [baseForm, setBaseForm] = useState({ name: '', description: '' });
  const [baseId, setBaseId] = useState('');
  const [documentForm, setDocumentForm] = useState({ id: '', title: '', content: '' });
  const [showBaseForm, setShowBaseForm] = useState(false);
  const [status, setStatus] = useState('');

  const load = () =>
    knowledgeApi
      .list()
      .then(setItems)
      .catch((error) => setStatus(errorText(error)));

  useEffect(() => {
    load();
  }, []);

  const saveBase = async () => {
    if (!baseForm.name) return;
    try {
      const item = baseId ? await knowledgeApi.update(baseId, baseForm) : await knowledgeApi.create(baseForm);
      setItems((current) =>
        baseId ? current.map((value) => (value.id === item.id ? item : value)) : [item, ...current],
      );
      setBaseForm({ name: '', description: '' });
      setBaseId('');
      setShowBaseForm(false);
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const open = async (item: KnowledgeBase) => {
    try {
      setEditing(item);
      setDocumentForm({ id: '', title: '', content: '' });
      setDocuments(await knowledgeApi.documents(item.id));
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const saveDocument = async () => {
    if (!editing || !documentForm.title || !documentForm.content) return;
    try {
      const saved = documentForm.id
        ? await knowledgeApi.updateDocument(editing.id, documentForm.id, {
            title: documentForm.title,
            content: documentForm.content,
          })
        : await knowledgeApi.createDocument(editing.id, {
            title: documentForm.title,
            content: documentForm.content,
          });
      setDocuments((current) =>
        documentForm.id ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current],
      );
      setDocumentForm({ id: '', title: '', content: '' });
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  return (
    <main className="assistants-root">
      <header className="assistants-header">
        <div>
          <h1>知识库</h1>
          <p>共 {items.length} 个知识库</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setBaseId('');
            setBaseForm({ name: '', description: '' });
            setShowBaseForm(true);
          }}
        >
          新建知识库
        </button>
      </header>
      {status && <p className="assistants-status">{status}</p>}
      <div className="assistant-grid">
        {items.map((item) => (
          <article className="assistant-card" key={item.id}>
            <div className="assistant-card-title">
              <h2>{item.name}</h2>
              <button
                className="danger-link"
                onClick={async () => {
                  if (!window.confirm(`删除知识库“${item.name}”？`)) return;
                  await knowledgeApi.remove(item.id);
                  setItems((current) => current.filter((value) => value.id !== item.id));
                }}
              >
                删除
              </button>
            </div>
            <p className="knowledge-description">{item.description}</p>
            <div className="assistant-card-actions">
              <button
                onClick={() => {
                  setBaseId(item.id);
                  setBaseForm({ name: item.name, description: item.description ?? '' });
                  setShowBaseForm(true);
                }}
              >
                编辑
              </button>
              <button className="primary" onClick={() => open(item)}>
                管理文档
              </button>
            </div>
          </article>
        ))}
        {!items.length && <div className="assistant-empty">暂无知识库</div>}
      </div>

      {showBaseForm && (
        <div className="assistant-modal-mask">
          <section className="assistant-modal create-modal">
            <header>
              <h2>{baseId ? '编辑知识库' : '新建知识库'}</h2>
              <button onClick={() => setShowBaseForm(false)}>×</button>
            </header>
            <div className="assistant-modal-body assistant-form-grid">
              <label className="wide">
                <span>名称</span>
                <input value={baseForm.name} onChange={(e) => setBaseForm({ ...baseForm, name: e.target.value })} />
              </label>
              <label className="wide">
                <span>描述</span>
                <textarea
                  rows={6}
                  value={baseForm.description}
                  onChange={(e) => setBaseForm({ ...baseForm, description: e.target.value })}
                />
              </label>
            </div>
            <footer>
              <button onClick={() => setShowBaseForm(false)}>取消</button>
              <button className="primary" onClick={saveBase}>
                保存
              </button>
            </footer>
          </section>
        </div>
      )}

      {editing && (
        <div className="assistant-modal-mask">
          <section className="assistant-modal knowledge-modal">
            <header>
              <h2>{editing.name} · 文档</h2>
              <button onClick={() => setEditing(null)}>×</button>
            </header>
            <div className="assistant-modal-body knowledge-layout">
              <aside className="knowledge-document-list">
                <button className="primary" onClick={() => setDocumentForm({ id: '', title: '', content: '' })}>
                  新建文档
                </button>
                {documents.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDocumentForm({ id: item.id, title: item.title, content: item.content })}
                  >
                    {item.title}
                  </button>
                ))}
              </aside>
              <div className="assistant-form-grid knowledge-editor">
                <label className="wide">
                  <span>标题</span>
                  <input
                    value={documentForm.title}
                    onChange={(e) => setDocumentForm({ ...documentForm, title: e.target.value })}
                  />
                </label>
                <label className="wide">
                  <span>正文</span>
                  <textarea
                    rows={18}
                    value={documentForm.content}
                    onChange={(e) => setDocumentForm({ ...documentForm, content: e.target.value })}
                  />
                </label>
                <div className="wide knowledge-editor-actions">
                  {documentForm.id && (
                    <button
                      className="danger-link"
                      onClick={async () => {
                        await knowledgeApi.removeDocument(editing.id, documentForm.id);
                        setDocuments((current) => current.filter((item) => item.id !== documentForm.id));
                        setDocumentForm({ id: '', title: '', content: '' });
                      }}
                    >
                      删除文档
                    </button>
                  )}
                  <button className="primary" onClick={saveDocument}>
                    保存文档
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
