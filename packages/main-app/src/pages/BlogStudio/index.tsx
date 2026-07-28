import { message } from 'antd';
import { type FormEvent, useEffect, useState } from 'react';
import { type BlogDraft, blogStudioService } from '../../services/blogStudioService';
import '../studio.css';

const emptyGenerator = {
  topic: '',
  guidance: '',
  tags: '',
  knowledgeBaseIds: '',
};

const csv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export default function BlogStudio() {
  const [drafts, setDrafts] = useState<BlogDraft[]>([]);
  const [selected, setSelected] = useState<BlogDraft | null>(null);
  const [generator, setGenerator] = useState(emptyGenerator);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = async (selectedId?: string) => {
    setLoading(true);
    try {
      const rows = await blogStudioService.list();
      setDrafts(rows);
      setSelected((current) => {
        const id = selectedId || current?.id;
        return rows.find((row) => row.id === id) || rows[0] || null;
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '博客草稿加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = '博客工作台 · 光域';
    load();
  }, []);

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setGenerating(true);
    try {
      const result = await blogStudioService.generate({
        topic: generator.topic,
        guidance: generator.guidance || undefined,
        tags: csv(generator.tags),
        knowledgeBaseIds: csv(generator.knowledgeBaseIds),
      });
      setGenerator(emptyGenerator);
      await load(result.id);
      message.success('博客草稿已生成，请审阅后发布');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '博客生成失败');
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const updateSelected = (field: keyof BlogDraft, value: unknown) => {
    setSelected((current) => (current ? { ...current, [field]: value } : current));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await blogStudioService.update(selected.id, {
        title: selected.title || '',
        slug: selected.slug || '',
        excerpt: selected.excerpt || '',
        tags: selected.tags,
        content: selected.content || '',
      });
      setSelected(result);
      await load(result.id);
      message.success('草稿已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '草稿保存失败');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!selected || !window.confirm(`确认把“${selected.title}”发布到博客仓库？`)) return;
    setPublishing(true);
    try {
      const result = await blogStudioService.publish(selected.id);
      setSelected(result);
      await load(result.id);
      message.success('博客已提交到博客仓库');
    } catch (error) {
      const text = error instanceof Error ? error.message : '博客发布失败';
      if (text.includes('已存在') && window.confirm(`${text}\n是否覆盖已有文章？`)) {
        try {
          const result = await blogStudioService.publish(selected.id, true);
          setSelected(result);
          await load(result.id);
          message.success('已有文章已覆盖');
          return;
        } catch (overwriteError) {
          message.error(overwriteError instanceof Error ? overwriteError.message : '覆盖发布失败');
        }
      } else {
        message.error(text);
      }
      await load(selected.id);
    } finally {
      setPublishing(false);
    }
  };

  const remove = async () => {
    if (!selected || !window.confirm(`确定删除草稿“${selected.title || selected.topic}”？`)) return;
    try {
      await blogStudioService.delete(selected.id);
      setSelected(null);
      await load();
      message.success('草稿已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '草稿删除失败');
    }
  };

  const editable = selected && ['draft', 'failed'].includes(selected.status);

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">AI publishing workflow</p>
          <h1>博客工作台</h1>
          <p className="workspace-page__description">
            输入主题，由 LangGraph 组织知识检索、文章生成和内容校验；文章先进入草稿，只有明确确认后才发布到博客仓库。
          </p>
        </div>
        <button type="button" className="workspace-button" onClick={() => load()} disabled={loading}>
          刷新
        </button>
      </header>

      <section className="workspace-panel">
        <div className="workspace-panel__header">
          <div>
            <h2>生成新文章</h2>
            <p className="workspace-panel__meta">生成不会直接发布，你可以完整审阅和修改。</p>
          </div>
        </div>
        <form className="studio-generator" onSubmit={generate}>
          <label className="workspace-field studio-generator__topic">
            问题或主题
            <textarea
              className="workspace-textarea"
              value={generator.topic}
              onChange={(event) => setGenerator({ ...generator, topic: event.target.value })}
              placeholder="例如：如何给个人 Agent 系统设计安全的配置发布流程"
              required
            />
          </label>
          <label className="workspace-field">
            额外要求
            <input
              className="workspace-input"
              value={generator.guidance}
              onChange={(event) => setGenerator({ ...generator, guidance: event.target.value })}
            />
          </label>
          <label className="workspace-field">
            标签（逗号分隔）
            <input
              className="workspace-input"
              value={generator.tags}
              onChange={(event) => setGenerator({ ...generator, tags: event.target.value })}
            />
          </label>
          <label className="workspace-field">
            知识库 ID（逗号分隔）
            <input
              className="workspace-input workspace-input--mono"
              value={generator.knowledgeBaseIds}
              onChange={(event) => setGenerator({ ...generator, knowledgeBaseIds: event.target.value })}
            />
          </label>
          <button type="submit" className="workspace-button workspace-button--primary" disabled={generating}>
            {generating ? '正在检索并生成…' : '生成草稿'}
          </button>
        </form>
      </section>

      <div className="studio-shell">
        <aside className="workspace-panel studio-sidebar">
          <div className="workspace-panel__header">
            <div>
              <h2>文章草稿</h2>
              <p className="workspace-panel__meta">{drafts.length} 篇</p>
            </div>
          </div>
          <div className="studio-list">
            {drafts.map((draft) => (
              <button
                type="button"
                className="studio-list__item"
                data-active={draft.id === selected?.id}
                key={draft.id}
                onClick={() => setSelected(draft)}
              >
                <strong>{draft.title || draft.topic}</strong>
                <span>status: {draft.status}</span>
                <span>updatedAt: {draft.updatedAt}</span>
              </button>
            ))}
            {!loading && !drafts.length && <p className="studio-empty">暂无博客草稿</p>}
          </div>
        </aside>

        <main className="studio-main">
          {!selected ? (
            <section className="workspace-panel studio-empty">生成或选择一篇草稿后开始编辑。</section>
          ) : (
            <>
              {selected.error && (
                <div className="workspace-feedback workspace-feedback--error" role="alert">
                  {selected.error}
                </div>
              )}
              <section className="workspace-panel">
                <div className="workspace-panel__header">
                  <div>
                    <h2>审阅文章</h2>
                    <p className="workspace-panel__meta">
                      status: {selected.status} · updatedAt: {selected.updatedAt}
                    </p>
                  </div>
                  <div className="workspace-inline-actions">
                    {editable && (
                      <button type="button" className="workspace-button" onClick={save} disabled={saving}>
                        {saving ? '保存中…' : '保存草稿'}
                      </button>
                    )}
                    {editable && (
                      <button
                        type="button"
                        className="workspace-button workspace-button--primary"
                        onClick={publish}
                        disabled={publishing}
                      >
                        {publishing ? '发布中…' : '确认发布'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="workspace-button workspace-button--danger"
                      onClick={remove}
                      disabled={selected.status === 'publishing'}
                    >
                      删除
                    </button>
                  </div>
                </div>
                <form className="workspace-form studio-wide-form" onSubmit={(event) => event.preventDefault()}>
                  <label className="workspace-field">
                    标题
                    <input
                      className="workspace-input"
                      value={selected.title || ''}
                      onChange={(event) => updateSelected('title', event.target.value)}
                      disabled={!editable}
                    />
                  </label>
                  <label className="workspace-field">
                    slug
                    <input
                      className="workspace-input workspace-input--mono"
                      value={selected.slug || ''}
                      onChange={(event) => updateSelected('slug', event.target.value)}
                      disabled={!editable}
                    />
                  </label>
                  <label className="workspace-field">
                    摘要
                    <textarea
                      className="workspace-textarea"
                      value={selected.excerpt || ''}
                      onChange={(event) => updateSelected('excerpt', event.target.value)}
                      disabled={!editable}
                    />
                  </label>
                  <label className="workspace-field">
                    标签（逗号分隔）
                    <input
                      className="workspace-input"
                      value={selected.tags.join(', ')}
                      onChange={(event) => updateSelected('tags', csv(event.target.value))}
                      disabled={!editable}
                    />
                  </label>
                  <label className="workspace-field">
                    Markdown 正文
                    <textarea
                      className="workspace-textarea workspace-input--mono studio-markdown-editor"
                      value={selected.content || ''}
                      onChange={(event) => updateSelected('content', event.target.value)}
                      disabled={!editable}
                      spellCheck={false}
                    />
                  </label>
                </form>
              </section>

              <section className="workspace-panel">
                <h2>生成与发布记录</h2>
                <dl className="workspace-data-list studio-records">
                  <div>
                    <dt>generationTrace</dt>
                    <dd className="workspace-code">{JSON.stringify(selected.generationTrace)}</dd>
                  </div>
                  <div>
                    <dt>knowledgeBaseIds</dt>
                    <dd className="workspace-code">{JSON.stringify(selected.knowledgeBaseIds)}</dd>
                  </div>
                  <div>
                    <dt>targetPath</dt>
                    <dd className="workspace-code">{selected.targetPath}</dd>
                  </div>
                  <div>
                    <dt>githubCommitSha</dt>
                    <dd className="workspace-code">{selected.githubCommitSha}</dd>
                  </div>
                  <div>
                    <dt>publishedUrl</dt>
                    <dd>
                      {selected.publishedUrl ? (
                        <a href={selected.publishedUrl} target="_blank" rel="noreferrer">
                          {selected.publishedUrl}
                        </a>
                      ) : (
                        selected.publishedUrl
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
