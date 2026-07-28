import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  knowledgeApi,
  type BatchDocumentAction,
  type KnowledgeBase,
  type KnowledgeBaseConfig,
  type KnowledgeChunk,
  type KnowledgeDocument,
  type KnowledgeImportCapabilities,
  type KnowledgeSearchResult,
} from './api';
import './styles.css';

type WorkspaceTab = 'documents' | 'retrieval' | 'settings';

const defaultConfig: KnowledgeBaseConfig = {
  chunkMode: 'recursive',
  maxCharacters: 1400,
  overlap: 200,
  separator: '\n\n',
  removeExtraSpaces: true,
  removeUrlsEmails: false,
  retrievalMode: 'hybrid',
  topK: 8,
  scoreThreshold: 0,
  semanticWeight: 0.35,
  keywordWeight: 0.65,
  rerankEnabled: false,
  rerankModel: '',
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

const emptyBaseForm = () => ({
  name: '',
  description: '',
  config: { ...defaultConfig },
});

const sourceName = (document: KnowledgeDocument) => document.fileName || document.title;

export default function KnowledgeBasesApp() {
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [importCapabilities, setImportCapabilities] = useState<KnowledgeImportCapabilities | null>(null);
  const [active, setActive] = useState<KnowledgeBase | null>(null);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [tab, setTab] = useState<WorkspaceTab>('documents');
  const [loading, setLoading] = useState(true);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [baseModal, setBaseModal] = useState(false);
  const [baseFormId, setBaseFormId] = useState('');
  const [baseForm, setBaseForm] = useState(emptyBaseForm);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus('');
    try {
      const [nextItems, capabilities] = await Promise.all([knowledgeApi.list(), knowledgeApi.importCapabilities()]);
      setItems(nextItems);
      setImportCapabilities(capabilities);
    } catch (error) {
      setStatus(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDocuments = useCallback(async (baseId: string, quiet = false) => {
    if (!quiet) setDocumentsLoading(true);
    try {
      setDocuments(await knowledgeApi.documents(baseId));
    } catch (error) {
      if (!quiet) setStatus(errorText(error));
    } finally {
      if (!quiet) setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!active) return;
    const hasPending = documents.some((item) => item.status === 'pending' || item.status === 'processing');
    if (!hasPending) return;
    const timer = window.setInterval(() => {
      void loadDocuments(active.id, true);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [active, documents, loadDocuments]);

  const openBase = async (item: KnowledgeBase) => {
    setActive(item);
    setTab('documents');
    setDocuments([]);
    setStatus('');
    await loadDocuments(item.id);
  };

  const showCreateBase = () => {
    setBaseFormId('');
    setBaseForm(emptyBaseForm());
    setBaseModal(true);
  };

  const showEditBase = (item: KnowledgeBase) => {
    setBaseFormId(item.id);
    setBaseForm({
      name: item.name,
      description: item.description ?? '',
      config: { ...item.config },
    });
    setBaseModal(true);
  };

  const saveBase = async () => {
    if (!baseForm.name.trim()) return;
    setStatus('');
    try {
      const saved = baseFormId
        ? await knowledgeApi.update(baseFormId, {
            name: baseForm.name,
            description: baseForm.description,
            config: baseForm.config,
          })
        : await knowledgeApi.create({
            name: baseForm.name,
            description: baseForm.description,
            config: baseForm.config,
          });
      setItems((current) =>
        baseFormId ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current],
      );
      if (active?.id === saved.id) setActive(saved);
      setBaseModal(false);
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  const removeBase = async (item: KnowledgeBase) => {
    if (!window.confirm(`删除知识库“${item.name}”及全部文档和分段？`)) return;
    setStatus('');
    try {
      await knowledgeApi.remove(item.id);
      setItems((current) => current.filter((value) => value.id !== item.id));
      if (active?.id === item.id) {
        setActive(null);
        setDocuments([]);
      }
    } catch (error) {
      setStatus(errorText(error));
    }
  };

  return (
    <main className="knowledge-root">
      {active ? (
        <KnowledgeWorkspace
          base={active}
          documents={documents}
          importCapabilities={importCapabilities}
          documentsLoading={documentsLoading}
          tab={tab}
          status={status}
          onTab={setTab}
          onBack={() => {
            setActive(null);
            setDocuments([]);
            setStatus('');
            void load();
          }}
          onEdit={() => showEditBase(active)}
          onDocumentsChange={setDocuments}
          onRefresh={async () => {
            await loadDocuments(active.id);
            try {
              const refreshed = await knowledgeApi.get(active.id);
              setActive(refreshed);
              setItems((current) => current.map((item) => (item.id === refreshed.id ? refreshed : item)));
            } catch (error) {
              setStatus(errorText(error));
            }
          }}
          onStatus={setStatus}
          onBaseChange={(value) => {
            setActive(value);
            setItems((current) => current.map((item) => (item.id === value.id ? value : item)));
          }}
        />
      ) : (
        <>
          <header className="knowledge-page-header">
            <div>
              <p className="knowledge-eyebrow">KNOWLEDGE</p>
              <h1>知识库</h1>
              <p>导入资料、管理分段并测试真实召回结果。</p>
            </div>
            <button className="knowledge-primary knowledge-fixed-button" onClick={showCreateBase}>
              新建知识库
            </button>
          </header>

          {status && (
            <p className="knowledge-status" role="alert">
              {status}
            </p>
          )}

          <section className="knowledge-base-grid" aria-busy={loading}>
            {items.map((item) => (
              <article className="knowledge-base-card" key={item.id}>
                <header>
                  <div>
                    <h2>{item.name}</h2>
                    <p>{item.description}</p>
                  </div>
                  <button
                    className="knowledge-icon-button"
                    aria-label={`编辑 ${item.name}`}
                    onClick={() => showEditBase(item)}
                  >
                    编辑
                  </button>
                </header>
                <dl className="knowledge-card-stats">
                  <div>
                    <dt>文档</dt>
                    <dd>{item.stats.documentCount}</dd>
                  </div>
                  <div>
                    <dt>分段</dt>
                    <dd>{item.stats.chunkCount}</dd>
                  </div>
                  <div>
                    <dt>处理中</dt>
                    <dd>{item.stats.processingCount}</dd>
                  </div>
                  <div>
                    <dt>失败</dt>
                    <dd>{item.stats.failedCount}</dd>
                  </div>
                </dl>
                <footer>
                  <button className="knowledge-danger-link" onClick={() => void removeBase(item)}>
                    删除
                  </button>
                  <button className="knowledge-primary" onClick={() => void openBase(item)}>
                    打开知识库
                  </button>
                </footer>
              </article>
            ))}
            {!items.length && (
              <div className="knowledge-empty">
                <strong>{loading ? '正在加载…' : '还没有知识库'}</strong>
                {!loading && <span>创建一个知识库，然后导入文件或录入文本。</span>}
              </div>
            )}
          </section>
        </>
      )}

      {baseModal && (
        <BaseFormModal
          title={baseFormId ? '编辑知识库' : '新建知识库'}
          value={baseForm}
          onChange={setBaseForm}
          onClose={() => setBaseModal(false)}
          onSave={() => void saveBase()}
        />
      )}
    </main>
  );
}

function KnowledgeWorkspace({
  base,
  documents,
  importCapabilities,
  documentsLoading,
  tab,
  status,
  onTab,
  onBack,
  onEdit,
  onDocumentsChange,
  onRefresh,
  onStatus,
  onBaseChange,
}: {
  base: KnowledgeBase;
  documents: KnowledgeDocument[];
  importCapabilities: KnowledgeImportCapabilities | null;
  documentsLoading: boolean;
  tab: WorkspaceTab;
  status: string;
  onTab: (tab: WorkspaceTab) => void;
  onBack: () => void;
  onEdit: () => void;
  onDocumentsChange: (items: KnowledgeDocument[]) => void;
  onRefresh: () => Promise<void>;
  onStatus: (value: string) => void;
  onBaseChange: (value: KnowledgeBase) => void;
}) {
  return (
    <div className="knowledge-workspace">
      <header className="knowledge-workspace-header">
        <button className="knowledge-back-button" onClick={onBack}>
          ← 返回
        </button>
        <div>
          <h1>{base.name}</h1>
          <p>{base.description}</p>
        </div>
        <button className="knowledge-fixed-button" onClick={onEdit}>
          编辑
        </button>
      </header>

      <section className="knowledge-overview">
        <Stat label="文档" value={base.stats.documentCount} />
        <Stat label="分段" value={base.stats.chunkCount} />
        <Stat label="字符" value={base.stats.characterCount} />
        <Stat label="处理中" value={base.stats.processingCount} />
        <Stat label="失败" value={base.stats.failedCount} />
      </section>

      <nav className="knowledge-tabs" aria-label="知识库功能">
        <button className={tab === 'documents' ? 'active' : ''} onClick={() => onTab('documents')}>
          文档与分段
        </button>
        <button className={tab === 'retrieval' ? 'active' : ''} onClick={() => onTab('retrieval')}>
          召回测试
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => onTab('settings')}>
          分段与检索配置
        </button>
      </nav>

      {status && (
        <p className="knowledge-status" role="alert">
          {status}
        </p>
      )}

      {tab === 'documents' && (
        <DocumentsPanel
          base={base}
          documents={documents}
          importCapabilities={importCapabilities}
          loading={documentsLoading}
          onChange={onDocumentsChange}
          onRefresh={onRefresh}
          onStatus={onStatus}
        />
      )}
      {tab === 'retrieval' && <RetrievalPanel base={base} onStatus={onStatus} />}
      {tab === 'settings' && <SettingsPanel base={base} onChange={onBaseChange} onStatus={onStatus} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <dl className="knowledge-stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </dl>
  );
}

function DocumentsPanel({
  base,
  documents,
  importCapabilities,
  loading,
  onChange,
  onRefresh,
  onStatus,
}: {
  base: KnowledgeBase;
  documents: KnowledgeDocument[];
  importCapabilities: KnowledgeImportCapabilities | null;
  loading: boolean;
  onChange: (items: KnowledgeDocument[]) => void;
  onRefresh: () => Promise<void>;
  onStatus: (value: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [textModal, setTextModal] = useState(false);
  const [textForm, setTextForm] = useState({ title: '', content: '' });
  const [editingDocument, setEditingDocument] = useState<KnowledgeDocument | null>(null);
  const [chunkDocument, setChunkDocument] = useState<KnowledgeDocument | null>(null);

  const filtered = useMemo(
    () =>
      documents.filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (!query.trim()) return true;
        const text = query.trim().toLowerCase();
        return sourceName(item).toLowerCase().includes(text);
      }),
    [documents, query, statusFilter],
  );

  useEffect(() => {
    setSelected((current) => current.filter((id) => documents.some((item) => item.id === id)));
  }, [documents]);

  const importFiles = async (files: File[]) => {
    if (!files.length) return;
    if (importCapabilities && files.length > importCapabilities.maxFiles) {
      onStatus(`maxFiles: ${importCapabilities.maxFiles}`);
      return;
    }
    if (importCapabilities && files.some((file) => file.size > importCapabilities.maxFileSizeBytes)) {
      onStatus(`maxFileSizeBytes: ${importCapabilities.maxFileSizeBytes}`);
      return;
    }
    if (
      importCapabilities &&
      files.reduce((total, file) => total + file.size, 0) > importCapabilities.maxRequestSizeBytes
    ) {
      onStatus(`maxRequestSizeBytes: ${importCapabilities.maxRequestSizeBytes}`);
      return;
    }
    setUploading(true);
    onStatus('');
    try {
      const result = await knowledgeApi.importFiles(base.id, files);
      onChange([...result.documents, ...documents]);
      await onRefresh();
    } catch (error) {
      onStatus(errorText(error));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const saveText = async () => {
    if (!textForm.title.trim() || !textForm.content.trim()) return;
    onStatus('');
    try {
      const saved = editingDocument
        ? await knowledgeApi.updateDocument(base.id, editingDocument.id, textForm)
        : await knowledgeApi.createText(base.id, textForm);
      onChange(
        editingDocument
          ? documents.map((document) => (document.id === saved.id ? saved : document))
          : [saved, ...documents],
      );
      setTextModal(false);
      setEditingDocument(null);
      setTextForm({ title: '', content: '' });
      await onRefresh();
    } catch (error) {
      onStatus(errorText(error));
    }
  };

  const batch = async (action: BatchDocumentAction, documentIds = selected) => {
    if (!documentIds.length) return;
    if (action === 'delete' && !window.confirm(`删除选中的 ${documentIds.length} 个文档？`)) return;
    onStatus('');
    try {
      await knowledgeApi.batchDocuments(base.id, documentIds, action);
      setSelected([]);
      await onRefresh();
    } catch (error) {
      onStatus(errorText(error));
    }
  };

  const changeEnabled = async (item: KnowledgeDocument) => {
    onStatus('');
    try {
      const saved = await knowledgeApi.updateDocument(base.id, item.id, { enabled: !item.enabled });
      onChange(documents.map((document) => (document.id === saved.id ? saved : document)));
    } catch (error) {
      onStatus(errorText(error));
    }
  };

  return (
    <section className="knowledge-panel knowledge-documents-panel">
      <div
        className={`knowledge-dropzone ${dragging ? 'dragging' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void importFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={importCapabilities?.acceptedExtensions.join(',')}
          hidden
          onChange={(event) => void importFiles(Array.from(event.target.files ?? []))}
        />
        <div>
          <strong>{uploading ? '正在导入文件…' : '拖拽文件到这里批量导入'}</strong>
          {importCapabilities ? (
            <>
              <span>acceptedExtensions: {importCapabilities.acceptedExtensions.join(', ')}</span>
              <span>acceptedMimeTypes: {importCapabilities.acceptedMimeTypes.join(', ')}</span>
              <span>
                maxFiles: {importCapabilities.maxFiles} · maxFileSizeBytes: {importCapabilities.maxFileSizeBytes} ·
                maxRequestSizeBytes: {importCapabilities.maxRequestSizeBytes}
              </span>
            </>
          ) : (
            <span>正在读取服务端导入限制…</span>
          )}
        </div>
        <div className="knowledge-dropzone-actions">
          <button disabled={uploading} onClick={() => fileInput.current?.click()}>
            选择文件
          </button>
          <button
            disabled={uploading}
            onClick={() => {
              setEditingDocument(null);
              setTextForm({ title: '', content: '' });
              setTextModal(true);
            }}
          >
            新建文本
          </button>
        </div>
      </div>

      <div className="knowledge-document-toolbar">
        <div className="knowledge-filter-controls">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="查询文档名称" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">全部状态</option>
            <option value="pending">pending</option>
            <option value="processing">processing</option>
            <option value="ready">ready</option>
            <option value="failed">failed</option>
          </select>
          <button onClick={() => void onRefresh()} disabled={loading}>
            {loading ? '刷新中…' : '刷新'}
          </button>
        </div>
        <div className="knowledge-batch-actions">
          <span>已选 {selected.length}</span>
          <button
            disabled={!documents.length}
            onClick={() =>
              void batch(
                'reindex',
                documents.map((item) => item.id),
              )
            }
          >
            重建全部
          </button>
          <button disabled={!selected.length} onClick={() => void batch('enable')}>
            启用
          </button>
          <button disabled={!selected.length} onClick={() => void batch('disable')}>
            停用
          </button>
          <button disabled={!selected.length} onClick={() => void batch('reindex')}>
            重建
          </button>
          <button className="knowledge-danger-link" disabled={!selected.length} onClick={() => void batch('delete')}>
            删除
          </button>
        </div>
      </div>

      <div className="knowledge-table-wrap">
        <table className="knowledge-document-table">
          <thead>
            <tr>
              <th className="knowledge-checkbox-cell">
                <input
                  type="checkbox"
                  aria-label="选择当前全部文档"
                  checked={Boolean(filtered.length) && filtered.every((item) => selected.includes(item.id))}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelected((current) => [...new Set([...current, ...filtered.map((item) => item.id)])]);
                    } else {
                      const ids = new Set(filtered.map((item) => item.id));
                      setSelected((current) => current.filter((id) => !ids.has(id)));
                    }
                  }}
                />
              </th>
              <th>文档</th>
              <th>状态 / 进度</th>
              <th>分段</th>
              <th>Embedding</th>
              <th>启用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td className="knowledge-checkbox-cell">
                  <input
                    type="checkbox"
                    aria-label={`选择 ${sourceName(item)}`}
                    checked={selected.includes(item.id)}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id),
                      )
                    }
                  />
                </td>
                <td>
                  <strong>{sourceName(item)}</strong>
                  <span>mimeType: {item.mimeType ?? ''}</span>
                  <span>size: {item.size ?? ''}</span>
                  {item.error && <em>{item.error}</em>}
                </td>
                <td>
                  <code>{item.status}</code>
                  <span>progress: {item.progress}</span>
                </td>
                <td>
                  <span>chunkCount: {item.chunkCount}</span>
                  <span>characterCount: {item.characterCount}</span>
                </td>
                <td>
                  <code>{item.embeddingStatus}</code>
                  <span>{item.embeddingModel}</span>
                </td>
                <td>
                  <button
                    className={`knowledge-switch ${item.enabled ? 'on' : ''}`}
                    role="switch"
                    aria-checked={item.enabled}
                    onClick={() => void changeEnabled(item)}
                  >
                    <span />
                    {String(item.enabled)}
                  </button>
                </td>
                <td>
                  <div className="knowledge-row-actions">
                    <button onClick={() => setChunkDocument(item)}>分段</button>
                    {item.sourceType === 'manual' && (
                      <button
                        onClick={() => {
                          setEditingDocument(item);
                          setTextForm({ title: item.title, content: item.content ?? '' });
                          setTextModal(true);
                        }}
                      >
                        编辑
                      </button>
                    )}
                    <button onClick={() => void batch('reindex', [item.id])}>重建</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7}>
                  <div className="knowledge-empty compact">{loading ? '正在加载文档…' : '没有匹配的文档'}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {textModal && (
        <TextDocumentModal
          title={editingDocument ? '编辑文本文档' : '新建文本文档'}
          submitText={editingDocument ? '保存并重建' : '保存并处理'}
          value={textForm}
          onChange={setTextForm}
          onClose={() => {
            setTextModal(false);
            setEditingDocument(null);
          }}
          onSave={() => void saveText()}
        />
      )}
      {chunkDocument && (
        <ChunksDrawer
          baseId={base.id}
          document={chunkDocument}
          onClose={() => setChunkDocument(null)}
          onStatus={onStatus}
        />
      )}
    </section>
  );
}

function RetrievalPanel({ base, onStatus }: { base: KnowledgeBase; onStatus: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const [config, setConfig] = useState({ ...base.config });
  const [results, setResults] = useState<KnowledgeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setHasSearched(true);
    onStatus('');
    try {
      setResults(
        await knowledgeApi.search(base.id, {
          query,
          retrievalMode: config.retrievalMode,
          topK: config.topK,
          scoreThreshold: config.scoreThreshold,
          semanticWeight: config.semanticWeight,
          keywordWeight: config.keywordWeight,
          rerankEnabled: config.rerankEnabled,
          rerankModel: config.rerankModel,
        }),
      );
    } catch (error) {
      onStatus(errorText(error));
    } finally {
      setSearching(false);
    }
  };

  return (
    <section className="knowledge-panel knowledge-retrieval-layout">
      <aside className="knowledge-config-card">
        <h2>本次召回参数</h2>
        <p>这些参数仅用于本次测试，不会覆盖知识库配置。</p>
        <ConfigFields value={config} onChange={setConfig} retrievalOnly />
      </aside>
      <div className="knowledge-retrieval-main">
        <div className="knowledge-query-box">
          <textarea
            rows={4}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="输入问题或需要查找的内容"
          />
          <button
            className="knowledge-primary knowledge-fixed-button"
            onClick={() => void search()}
            disabled={searching}
          >
            {searching ? '检索中…' : '测试召回'}
          </button>
        </div>

        <header className="knowledge-result-header">
          <div>
            <h2>召回结果</h2>
            <span>返回 {results.length} 条</span>
          </div>
        </header>
        <div className="knowledge-result-list">
          {results.map((result) => (
            <article key={result.chunkId}>
              <header>
                <strong>
                  [{result.citation}] {result.documentTitle}
                </strong>
                <code>{result.score}</code>
              </header>
              <dl>
                <div>
                  <dt>vectorScore</dt>
                  <dd>{result.vectorScore ?? ''}</dd>
                </div>
                <div>
                  <dt>keywordScore</dt>
                  <dd>{result.keywordScore ?? ''}</dd>
                </div>
                <div>
                  <dt>rerankScore</dt>
                  <dd>{result.rerankScore ?? ''}</dd>
                </div>
                <div>
                  <dt>chunkIndex</dt>
                  <dd>{result.chunkIndex}</dd>
                </div>
                <div>
                  <dt>documentId</dt>
                  <dd>{result.documentId}</dd>
                </div>
                <div>
                  <dt>chunkId</dt>
                  <dd>{result.chunkId}</dd>
                </div>
              </dl>
              <p>{result.content}</p>
            </article>
          ))}
          {!results.length && (
            <div className="knowledge-empty compact">{hasSearched ? '没有召回结果' : '填写问题后测试召回'}</div>
          )}
        </div>
      </div>
    </section>
  );
}

function SettingsPanel({
  base,
  onChange,
  onStatus,
}: {
  base: KnowledgeBase;
  onChange: (value: KnowledgeBase) => void;
  onStatus: (value: string) => void;
}) {
  const [config, setConfig] = useState({ ...base.config });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    onStatus('');
    try {
      onChange(await knowledgeApi.update(base.id, { config }));
    } catch (error) {
      onStatus(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="knowledge-panel knowledge-settings">
      <div className="knowledge-settings-heading">
        <div>
          <h2>分段与检索配置</h2>
          <p>保存后用于新导入和重建索引；需要时可到文档页批量重建。</p>
        </div>
        <button className="knowledge-primary knowledge-fixed-button" onClick={() => void save()} disabled={saving}>
          {saving ? '保存中…' : '保存配置'}
        </button>
      </div>
      <ConfigFields value={config} onChange={setConfig} />
    </section>
  );
}

function ConfigFields({
  value,
  onChange,
  retrievalOnly = false,
}: {
  value: KnowledgeBaseConfig;
  onChange: (value: KnowledgeBaseConfig) => void;
  retrievalOnly?: boolean;
}) {
  const number = (key: keyof KnowledgeBaseConfig, raw: string) =>
    onChange({ ...value, [key]: raw === '' ? 0 : Number(raw) });

  return (
    <div className="knowledge-config-sections">
      {!retrievalOnly && (
        <section>
          <header>
            <h3>分段策略</h3>
            <p>配置文档解析后的切分方式。</p>
          </header>
          <div className="knowledge-field-grid">
            <label>
              <span>chunkMode</span>
              <select
                value={value.chunkMode}
                onChange={(event) =>
                  onChange({ ...value, chunkMode: event.target.value as KnowledgeBaseConfig['chunkMode'] })
                }
              >
                <option value="recursive">recursive</option>
                <option value="paragraph">paragraph</option>
              </select>
            </label>
            <label>
              <span>separator</span>
              <textarea
                rows={2}
                value={value.separator}
                onChange={(event) => onChange({ ...value, separator: event.target.value })}
              />
            </label>
            <label>
              <span>maxCharacters</span>
              <input
                type="number"
                value={value.maxCharacters}
                onChange={(event) => number('maxCharacters', event.target.value)}
              />
            </label>
            <label>
              <span>overlap</span>
              <input type="number" value={value.overlap} onChange={(event) => number('overlap', event.target.value)} />
            </label>
            <label className="knowledge-check">
              <input
                type="checkbox"
                checked={value.removeExtraSpaces}
                onChange={(event) => onChange({ ...value, removeExtraSpaces: event.target.checked })}
              />
              <span>removeExtraSpaces</span>
            </label>
            <label className="knowledge-check">
              <input
                type="checkbox"
                checked={value.removeUrlsEmails}
                onChange={(event) => onChange({ ...value, removeUrlsEmails: event.target.checked })}
              />
              <span>removeUrlsEmails</span>
            </label>
          </div>
        </section>
      )}
      <section>
        <header>
          <h3>检索策略</h3>
          <p>语义、关键词或混合召回参数。</p>
        </header>
        <div className="knowledge-field-grid">
          <label>
            <span>retrievalMode</span>
            <select
              value={value.retrievalMode}
              onChange={(event) =>
                onChange({ ...value, retrievalMode: event.target.value as KnowledgeBaseConfig['retrievalMode'] })
              }
            >
              <option value="hybrid">hybrid</option>
              <option value="vector">vector</option>
              <option value="keyword">keyword</option>
            </select>
          </label>
          <label>
            <span>topK</span>
            <input type="number" value={value.topK} onChange={(event) => number('topK', event.target.value)} />
          </label>
          <label>
            <span>scoreThreshold</span>
            <input
              type="number"
              step="0.01"
              value={value.scoreThreshold}
              onChange={(event) => number('scoreThreshold', event.target.value)}
            />
          </label>
          <label>
            <span>semanticWeight</span>
            <input
              type="number"
              step="0.01"
              value={value.semanticWeight}
              onChange={(event) => number('semanticWeight', event.target.value)}
            />
          </label>
          <label>
            <span>keywordWeight</span>
            <input
              type="number"
              step="0.01"
              value={value.keywordWeight}
              onChange={(event) => number('keywordWeight', event.target.value)}
            />
          </label>
          <label className="knowledge-check">
            <input
              type="checkbox"
              checked={value.rerankEnabled}
              onChange={(event) => onChange({ ...value, rerankEnabled: event.target.checked })}
            />
            <span>rerankEnabled</span>
          </label>
          <label className="knowledge-wide">
            <span>rerankModel</span>
            <input
              value={value.rerankModel}
              onChange={(event) => onChange({ ...value, rerankModel: event.target.value })}
            />
          </label>
        </div>
      </section>
    </div>
  );
}

function ChunksDrawer({
  baseId,
  document,
  onClose,
  onStatus,
}: {
  baseId: string;
  document: KnowledgeDocument;
  onClose: () => void;
  onStatus: (value: string) => void;
}) {
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<KnowledgeChunk | null>(null);
  const [content, setContent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setChunks(await knowledgeApi.chunks(baseId, document.id));
    } catch (error) {
      onStatus(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [baseId, document.id, onStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (chunk: KnowledgeChunk, body: { content?: string; enabled?: boolean }) => {
    onStatus('');
    try {
      const saved = await knowledgeApi.updateChunk(baseId, document.id, chunk.id, body);
      setChunks((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setEditing(null);
    } catch (error) {
      onStatus(errorText(error));
    }
  };

  return (
    <div className="knowledge-modal-mask">
      <section className="knowledge-drawer">
        <header>
          <div>
            <h2>{sourceName(document)} · 分段</h2>
            <p>chunkCount: {document.chunkCount}</p>
          </div>
          <button className="knowledge-close-button" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="knowledge-chunk-list">
          {chunks.map((chunk) => (
            <article key={chunk.id}>
              <header>
                <div>
                  <strong>chunkIndex: {chunk.chunkIndex}</strong>
                  <span>
                    charStart: {chunk.charStart} · charEnd: {chunk.charEnd} · estimatedTokens: {chunk.estimatedTokens}
                  </span>
                </div>
                <div className="knowledge-row-actions">
                  <button
                    className={`knowledge-switch ${chunk.enabled ? 'on' : ''}`}
                    role="switch"
                    aria-checked={chunk.enabled}
                    onClick={() => void update(chunk, { enabled: !chunk.enabled })}
                  >
                    <span />
                    {String(chunk.enabled)}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(chunk);
                      setContent(chunk.content);
                    }}
                  >
                    编辑
                  </button>
                </div>
              </header>
              <p>{chunk.content}</p>
              <footer>
                <code>id: {chunk.id}</code>
                <code>embeddingModel: {chunk.embeddingModel ?? ''}</code>
              </footer>
            </article>
          ))}
          {!chunks.length && <div className="knowledge-empty compact">{loading ? '正在加载分段…' : '没有分段'}</div>}
        </div>
      </section>
      {editing && (
        <section className="knowledge-nested-modal">
          <header>
            <h2>编辑分段 {editing.chunkIndex}</h2>
            <button className="knowledge-close-button" onClick={() => setEditing(null)}>
              ×
            </button>
          </header>
          <textarea rows={18} value={content} onChange={(event) => setContent(event.target.value)} />
          <footer>
            <button onClick={() => setEditing(null)}>取消</button>
            <button className="knowledge-primary" onClick={() => void update(editing, { content })}>
              保存分段
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}

function TextDocumentModal({
  title,
  submitText,
  value,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  submitText: string;
  value: { title: string; content: string };
  onChange: (value: { title: string; content: string }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="knowledge-modal-mask">
      <section className="knowledge-dialog knowledge-text-dialog">
        <header>
          <h2>{title}</h2>
          <button className="knowledge-close-button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="knowledge-dialog-body">
          <label>
            <span>标题</span>
            <input value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} />
          </label>
          <label>
            <span>正文</span>
            <textarea
              rows={18}
              value={value.content}
              onChange={(event) => onChange({ ...value, content: event.target.value })}
            />
          </label>
        </div>
        <footer>
          <button onClick={onClose}>取消</button>
          <button className="knowledge-primary" onClick={onSave}>
            {submitText}
          </button>
        </footer>
      </section>
    </div>
  );
}

function BaseFormModal({
  title,
  value,
  onChange,
  onClose,
  onSave,
}: {
  title: string;
  value: { name: string; description: string; config: KnowledgeBaseConfig };
  onChange: (value: { name: string; description: string; config: KnowledgeBaseConfig }) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="knowledge-modal-mask">
      <section className="knowledge-dialog">
        <header>
          <h2>{title}</h2>
          <button className="knowledge-close-button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="knowledge-dialog-body">
          <div className="knowledge-field-grid">
            <label>
              <span>名称</span>
              <input value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} />
            </label>
            <label>
              <span>描述</span>
              <input
                value={value.description}
                onChange={(event) => onChange({ ...value, description: event.target.value })}
              />
            </label>
          </div>
          <ConfigFields value={value.config} onChange={(config) => onChange({ ...value, config })} />
        </div>
        <footer>
          <button onClick={onClose}>取消</button>
          <button className="knowledge-primary" onClick={onSave}>
            保存
          </button>
        </footer>
      </section>
    </div>
  );
}
