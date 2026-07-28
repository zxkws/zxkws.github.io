import { FormEvent, useEffect, useState } from 'react';
import { createWebsite, deleteWebsite, listWebsites, updateWebsite, type Website, type WebsiteInput } from './api';
import './styles.css';

const emptyForm: WebsiteInput = { name: '', url: '', intervalMinutes: 60, enabled: true };

const KeepaliveApp = () => {
  const [items, setItems] = useState<Website[]>([]);
  const [form, setForm] = useState<WebsiteInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await listWebsites());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '获取保活列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editingId) {
        await updateWebsite(editingId, form);
      } else {
        await createWebsite(form);
      }
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存保活地址失败');
      setLoading(false);
    }
  };

  const edit = (item: Website) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      url: item.url,
      intervalMinutes: item.intervalMinutes,
      enabled: item.enabled,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const remove = async (item: Website) => {
    if (!window.confirm(`确定删除 ${item.name}？`)) return;
    setError('');
    try {
      await deleteWebsite(item.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除保活地址失败');
    }
  };

  return (
    <main className="keepalive-page">
      <header className="keepalive-header">
        <div>
          <p className="keepalive-eyebrow">Uptime worker</p>
          <h1>定时轮询保活</h1>
          <p>后台按配置间隔访问目标网址，并保留最近一次真实响应。</p>
        </div>
        <button className="keepalive-button" disabled={loading} type="button" onClick={() => void load()}>
          {loading ? '刷新中…' : '刷新状态'}
        </button>
      </header>

      {error && (
        <div className="keepalive-error" role="alert">
          {error}
        </div>
      )}

      <section className="keepalive-panel">
        <div className="keepalive-panel-heading">
          <div>
            <h2>{editingId ? '编辑保活任务' : '新增保活任务'}</h2>
            <p>{editingId ? `id=${editingId}` : '提交后，服务端会按设定的分钟间隔执行访问。'}</p>
          </div>
        </div>
        <form className="keepalive-form" onSubmit={submit}>
          <label>
            <span>名称</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label className="keepalive-url-field">
            <span>网址</span>
            <input
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              placeholder="https://example.com"
              type="url"
              required
            />
          </label>
          <label>
            <span>间隔分钟</span>
            <input
              value={form.intervalMinutes}
              onChange={(event) => setForm({ ...form, intervalMinutes: Number(event.target.value) })}
              type="number"
              min="1"
              max="525600"
              required
            />
          </label>
          <label className="keepalive-check">
            <input
              checked={form.enabled}
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              type="checkbox"
            />
            <span>启用</span>
          </label>
          <div className="keepalive-form-actions">
            <button className="keepalive-button keepalive-button--primary" disabled={loading} type="submit">
              {loading ? '保存中…' : editingId ? '保存修改' : '添加任务'}
            </button>
            {editingId && (
              <button className="keepalive-button" type="button" onClick={cancelEdit}>
                取消
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="keepalive-panel keepalive-panel--table">
        <div className="keepalive-panel-heading">
          <div>
            <h2>保活任务</h2>
            <p>{items.length} items</p>
          </div>
        </div>
        <div className="keepalive-table-wrap">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>网址</th>
                <th>间隔分钟</th>
                <th>启用</th>
                <th>最近状态码</th>
                <th>最近访问时间</th>
                <th>下次访问时间</th>
                <th>最近响应</th>
                <th>最近错误</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.url}
                    </a>
                  </td>
                  <td>{item.intervalMinutes}</td>
                  <td>{String(item.enabled)}</td>
                  <td>{item.lastStatusCode}</td>
                  <td>{item.lastVisitedAt}</td>
                  <td>{item.nextVisitAt}</td>
                  <td className="keepalive-response-cell">
                    {item.lastResponse !== null && (
                      <details>
                        <summary>查看响应</summary>
                        <pre>{item.lastResponse}</pre>
                      </details>
                    )}
                  </td>
                  <td>{item.lastError}</td>
                  <td>
                    <div className="keepalive-row-actions">
                      <button
                        className="keepalive-button keepalive-button--small"
                        type="button"
                        onClick={() => edit(item)}
                      >
                        编辑
                      </button>
                      <button
                        className="keepalive-button keepalive-button--small keepalive-button--danger"
                        type="button"
                        onClick={() => void remove(item)}
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !items.length && (
                <tr>
                  <td className="keepalive-empty" colSpan={10}>
                    暂无保活任务
                  </td>
                </tr>
              )}
              {loading && !items.length && (
                <tr>
                  <td className="keepalive-empty" colSpan={10}>
                    正在加载保活任务…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
};

export default KeepaliveApp;
