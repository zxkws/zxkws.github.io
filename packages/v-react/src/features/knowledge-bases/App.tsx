import { useEffect, useState } from 'react';
import {
  knowledgeApi,
  type KnowledgeBase,
  type KnowledgeDocument,
  type KnowledgeSearchResult,
} from '../assistants/api';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setStatus('');
    try {
      setItems(await knowledgeApi.list());
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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
      setSearchQuery('');
      setSearchResults([]);
      setDocuments(await knowledgeApi.documents(item.id));
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const reindexDocument = async () => {
    if (!editing || !documentForm.id) return;
    setStatus('');
    try {
      const saved = await knowledgeApi.reindexDocument(editing.id, documentForm.id);
      setDocuments((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setStatus(`索引状态：${saved.status}`);
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const searchKnowledge = async () => {
    if (!editing || !searchQuery.trim()) return;
    setSearching(true);
    setStatus('');
    try {
      setSearchResults(await knowledgeApi.search(editing.id, searchQuery.trim()));
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setSearching(false);
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

  const removeBase = async (item: KnowledgeBase) => {
    if (!window.confirm(`删除知识库“${item.name}”？`)) return;
    setStatus('');
    try {
      await knowledgeApi.remove(item.id);
      setItems((current) => current.filter((value) => value.id !== item.id));
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const removeDocument = async () => {
    if (!editing || !documentForm.id) return;
    if (!window.confirm(`删除文档“${documentForm.title}”？`)) return;
    setStatus('');
    try {
      await knowledgeApi.removeDocument(editing.id, documentForm.id);
      setDocuments((current) => current.filter((item) => item.id !== documentForm.id));
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
      {status && (
        <p className="assistants-status" role="alert">
          {status}
        </p>
      )}
      <div className="assistant-grid">
        {items.map((item) => (
          <article className="assistant-card" key={item.id}>
            <div className="assistant-card-title">
              <h2>{item.name}</h2>
              <button className="danger-link" onClick={() => void removeBase(item)}>
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
        {!items.length && <div className="assistant-empty">{loading ? '正在加载知识库…' : '暂无知识库'}</div>}
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
            <div className="assistant-modal-body knowledge-modal-body">
              <section className="knowledge-search">
                <div>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="输入问题测试知识库召回"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void searchKnowledge();
                    }}
                  />
                  <button className="primary" onClick={searchKnowledge} disabled={searching}>
                    {searching ? '检索中…' : '测试检索'}
                  </button>
                </div>
                {searchResults.length ? (
                  <div className="knowledge-search-results">
                    {searchResults.map((result) => (
                      <article key={result.chunkId}>
                        <strong>
                          [{result.citation}] {result.title}
                        </strong>
                        <span>
                          score: {result.score} · chunkIndex: {result.chunkIndex} · chars: {result.charStart}-
                          {result.charEnd}
                        </span>
                        <p>{result.content}</p>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
              <div className="knowledge-layout">
                <aside className="knowledge-document-list">
                  <button className="primary" onClick={() => setDocumentForm({ id: '', title: '', content: '' })}>
                    新建文档
                  </button>
                  {documents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDocumentForm({ id: item.id, title: item.title, content: item.content })}
                    >
                      <strong>{item.title}</strong>
                      <span>
                        status: {item.status} · chunkCount: {item.chunkCount} · embeddingStatus: {item.embeddingStatus}
                      </span>
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
                      <>
                        <button onClick={() => void reindexDocument()}>重建索引</button>
                        <button className="danger-link" onClick={() => void removeDocument()}>
                          删除文档
                        </button>
                      </>
                    )}
                    <button className="primary" onClick={saveDocument}>
                      保存文档
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
