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
      if (editingId) await updateWebsite(editingId, form);
      else await createWebsite(form);
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
    setForm({ name: item.name, url: item.url, intervalMinutes: item.intervalMinutes, enabled: item.enabled });
  };

  const remove = async (item: Website) => {
    if (!window.confirm(`确定删除 ${item.name}？`)) return;
    try {
      await deleteWebsite(item.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '删除保活地址失败');
    }
  };

  return (
    <div className="keepalive-page">
      <header className="keepalive-header">
        <div>
          <h1>定时轮询保活</h1>
          <p>后台按分钟间隔访问目标网址，并保留最近一次真实响应。</p>
        </div>
        <button disabled={loading} type="button" onClick={() => void load()}>
          刷新状态
        </button>
      </header>
      {error && <div className="keepalive-error">{error}</div>}
      <form className="keepalive-form" onSubmit={submit}>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="名称"
          required
        />
        <input
          value={form.url}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://example.com"
          type="url"
          required
        />
        <input
          value={form.intervalMinutes}
          onChange={(e) => setForm({ ...form, intervalMinutes: Number(e.target.value) })}
          type="number"
          min="1"
          max="525600"
          required
        />
        <label>
          <input
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            type="checkbox"
          />
          启用
        </label>
        <button disabled={loading} type="submit">
          {editingId ? '保存' : '添加'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}
          >
            取消
          </button>
        )}
      </form>
      {loading && items.length === 0 ? (
        <p>加载中...</p>
      ) : (
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
                    <button onClick={() => edit(item)}>编辑</button>
                    <button onClick={() => void remove(item)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KeepaliveApp;
