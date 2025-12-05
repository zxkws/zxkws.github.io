import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFetchClient } from '@zxkws/shared-fetch';

const BASE_URL = import.meta.env.MODE === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api';

type DbType = 'mysql' | 'redis' | 'mongodb';

type DbAsset = {
  id?: string;
  name: string;
  type: DbType;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  databaseName?: string;
  authSource?: string;
  connectionUri?: string;
  environment?: string;
  tags?: string;
  description?: string;
  lastStatus?: string;
  lastLatencyMs?: number;
  lastMessage?: string;
  lastCheckedAt?: string | Date;
  cts?: string;
  uts?: string;
};

type CheckResult = {
  id: string;
  name: string;
  type: DbType;
  status: 'online' | 'offline';
  latencyMs?: number;
  message?: string;
  checkedAt: string | Date;
};

type UserProfile = {
  userId: string;
  username: string;
  role?: string;
};

type AuthState = 'pending' | 'ok' | 'need-login' | 'forbidden';

type FilterState = {
  type: 'all' | DbType;
  keyword: string;
};

const initialForm: DbAsset = {
  name: '',
  type: 'mysql',
  host: '',
  port: undefined,
  username: '',
  password: '',
  databaseName: '',
  authSource: '',
  connectionUri: '',
  environment: 'prod',
  tags: '',
  description: '',
};

const formatTime = (value?: string | Date) => {
  if (!value) return '--';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString('zh-CN');
};

const badgeClass = (type: DbType | string) => {
  switch (type) {
    case 'mysql':
      return 'badge badge-blue';
    case 'redis':
      return 'badge badge-red';
    case 'mongodb':
      return 'badge badge-green';
    default:
      return 'badge';
  }
};

const statusClass = (status?: string) => {
  if (status === 'online') return 'status-dot online';
  if (status === 'offline') return 'status-dot offline';
  return 'status-dot idle';
};

const maskSecret = (value?: string) => {
  if (!value) return '--';
  return value.length <= 3 ? '***' : `${value.slice(0, 2)}***${value.slice(-1)}`;
};

const unwrap = <T,>(payload: any): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export default function App({ basename }: { basename?: string }) {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [filters, setFilters] = useState<FilterState>({ type: 'all', keyword: '' });
  const [assets, setAssets] = useState<DbAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbAsset | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({});

  const client = useMemo(
    () =>
      createFetchClient({
        baseURL: BASE_URL,
        getToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('auth_token')),
        persistToken: (token) => {
          if (typeof window === 'undefined') return;
          localStorage.setItem('auth_token', token);
        },
        onUnauthorized: () => setAuthState('need-login'),
      }),
    [],
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }, []);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (filters.type !== 'all') payload.type = filters.type;
      if (filters.keyword.trim()) payload.keyword = filters.keyword.trim();
      const data = unwrap<DbAsset[]>(await client('/db-assets/list', payload));
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [client, filters]);

  const loadProfile = useCallback(async () => {
    setAuthState('pending');
    try {
      const info = unwrap<UserProfile>(await client('/v1/user', undefined, { method: 'GET' }));
      setProfile(info);
      if (info.role !== 'admin') {
        setAuthState('forbidden');
        return;
      }
      setAuthState('ok');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('401')) {
        setAuthState('need-login');
      } else {
        setAuthState('forbidden');
      }
      setError('无法获取用户信息');
    }
  }, [client]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (authState === 'ok') {
      loadAssets();
    }
  }, [authState, loadAssets]);

  const startCreate = () => {
    setEditing({ ...initialForm });
    setModalOpen(true);
  };

  const startEdit = (item: DbAsset) => {
    setEditing({ ...item });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const saveAsset = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      showToast('请填写名称');
      return;
    }
    if (!editing.connectionUri && !editing.host) {
      showToast('请填写连接串或主机信息');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...editing,
        port: editing.port ? Number(editing.port) : undefined,
      };
      const endpoint = editing.id ? '/db-assets/update' : '/db-assets/create';
      await client(endpoint, payload);
      closeModal();
      showToast('保存成功');
      loadAssets();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = async (item: DbAsset) => {
    if (!item.id) return;
    const confirmed = typeof window !== 'undefined' ? window.confirm(`确认删除【${item.name}】?`) : true;
    if (!confirmed) return;
    try {
      await client('/db-assets/remove', { id: item.id });
      showToast('已删除');
      loadAssets();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败');
    }
  };

  const mergeCheck = (results: CheckResult[]) => {
    setAssets((prev) => {
      const map = new Map(prev.map((item) => [item.id, item] as const));
      results.forEach((res) => {
        const existing = map.get(res.id);
        if (existing) {
          map.set(res.id, {
            ...existing,
            lastStatus: res.status,
            lastLatencyMs: res.latencyMs,
            lastMessage: res.message,
            lastCheckedAt: res.checkedAt,
          });
        }
      });
      return Array.from(map.values());
    });
  };

  const checkAsset = async (id?: string) => {
    if (id) {
      setCheckingId(id);
    } else {
      setCheckingAll(true);
    }
    try {
      const payload = id ? { id } : {};
      const results = unwrap<CheckResult[]>(await client('/db-assets/check', payload));
      mergeCheck(results);
      showToast('检查完成');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '检查失败');
    } finally {
      setCheckingId(null);
      setCheckingAll(false);
    }
  };

  const toggleSecret = (id?: string) => {
    if (!id) return;
    setSecretVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const goLogin = () => {
    if (typeof window === 'undefined') return;
    const redirect = `${window.location.origin}${basename ?? ''}${window.location.pathname}${window.location.search}`;
    window.location.href = `/auth/login?redirect=${encodeURIComponent(redirect)}`;
  };

  const renderContent = () => {
    if (authState === 'pending') {
      return <div className="panel muted">正在校验权限...</div>;
    }

    if (authState === 'need-login') {
      return (
        <div className="panel muted">
          <h3>需要登录</h3>
          <p>请先登录后再访问数据库管控台。</p>
          <button className="btn primary" onClick={goLogin}>
            去登录
          </button>
        </div>
      );
    }

    if (authState === 'forbidden') {
      return (
        <div className="panel danger">
          <h3>权限不足</h3>
          <p>仅限拥有「admin」角色的同学使用。如果你需要访问，请联系管理员开通。</p>
        </div>
      );
    }

    return (
      <>
        <div className="toolbar">
          <div className="toolbar-left">
            <label className="field">
              <span className="field-label">类型</span>
              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as FilterState['type'] }))}
              >
                <option value="all">全部</option>
                <option value="mysql">MySQL</option>
                <option value="redis">Redis</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">关键词</span>
              <input
                value={filters.keyword}
                placeholder="名称 / 地址 / 标签"
                onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && loadAssets()}
              />
            </label>
            <button className="btn" onClick={loadAssets} disabled={loading}>
              {loading ? '查询中...' : '查询'}
            </button>
          </div>
          <div className="toolbar-right">
            <button
              className="btn"
              onClick={() => checkAsset()}
              disabled={checkingAll || loading || assets.length === 0}
            >
              {checkingAll ? '巡检中...' : '全部巡检'}
            </button>
            <button className="btn primary" onClick={startCreate}>
              新增数据源
            </button>
          </div>
        </div>

        {error && <div className="panel danger">{error}</div>}

        <div className="list">
          {assets.length === 0 && !loading && (
            <div className="panel muted">暂无数据源，点击右上角「新增」开始配置。</div>
          )}
          {assets.map((item) => {
            const secretOpen = item.id ? secretVisible[item.id] : false;
            return (
              <div className="card" key={item.id ?? item.name}>
                <div className="card-head">
                  <div className="card-title">
                    <span className={badgeClass(item.type)}>{item.type}</span>
                    <div>
                      <div className="name-row">
                        <span className="name">{item.name}</span>
                        {item.environment && <span className="pill">{item.environment}</span>}
                      </div>
                      {item.tags && <div className="sub">标签：{item.tags}</div>}
                    </div>
                  </div>
                  <div className="status">
                    <span className={statusClass(item.lastStatus)}></span>
                    <span className="status-text">{item.lastStatus ?? 'unknown'}</span>
                    {item.lastLatencyMs !== undefined && <span className="latency">{item.lastLatencyMs} ms</span>}
                    <button className="link" onClick={() => checkAsset(item.id)} disabled={checkingId === item.id}>
                      {checkingId === item.id ? '检查中...' : '检查'}
                    </button>
                  </div>
                </div>

                <div className="card-body">
                  <div className="grid">
                    <div>
                      <p className="label">地址</p>
                      <p className="value">
                        {item.connectionUri ? (
                          <span className="mono">{item.connectionUri}</span>
                        ) : item.host ? (
                          <span className="mono">{`${item.host}${item.port ? `:${item.port}` : ''}`}</span>
                        ) : (
                          '--'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="label">库 / 命名空间</p>
                      <p className="value">{item.databaseName || '--'}</p>
                    </div>
                    <div>
                      <p className="label">账号</p>
                      <p className="value">{item.username || '--'}</p>
                    </div>
                    <div>
                      <p className="label">密码</p>
                      <p className="value">
                        {secretOpen ? item.password || '--' : maskSecret(item.password)}
                        {item.id && (
                          <button className="link" onClick={() => toggleSecret(item.id)}>
                            {secretOpen ? '隐藏' : '显示'}
                          </button>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="label">上次检查</p>
                      <p className="value">{formatTime(item.lastCheckedAt)}</p>
                    </div>
                    <div>
                      <p className="label">备注</p>
                      <p className="value ellipsis" title={item.description || ''}>
                        {item.description || '--'}
                      </p>
                    </div>
                  </div>
                  {item.lastMessage && (
                    <div className="note">
                      <strong>日志：</strong>
                      <span>{item.lastMessage}</span>
                    </div>
                  )}
                </div>

                <div className="card-foot">
                  <div className="meta">创建时间：{formatTime(item.cts)}</div>
                  <div className="actions">
                    <button className="btn ghost" onClick={() => startEdit(item)}>
                      编辑
                    </button>
                    <button className="btn ghost" onClick={() => removeAsset(item)}>
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>数据库管控台</h1>
          <p className="sub">集中管理 MySQL / Redis / MongoDB 的配置与健康状态。仅限管理员访问。</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={loadAssets} disabled={loading}>
            刷新
          </button>
          <button className="btn primary" onClick={startCreate} disabled={authState !== 'ok'}>
            新增数据源
          </button>
        </div>
      </header>

      {renderContent()}

      {isModalOpen && editing && (
        <div className="modal-mask">
          <div className="modal">
            <div className="modal-head">
              <h3>{editing.id ? '编辑数据源' : '新增数据源'}</h3>
              <button className="link" onClick={closeModal}>
                关闭
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">名称 *</span>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    placeholder="例如：生产主库 / Redis-Cache"
                  />
                </label>
                <label className="field">
                  <span className="field-label">类型 *</span>
                  <select
                    value={editing.type}
                    onChange={(e) => setEditing({ ...editing, type: e.target.value as DbType })}
                  >
                    <option value="mysql">MySQL</option>
                    <option value="redis">Redis</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">环境</span>
                  <input
                    value={editing.environment ?? ''}
                    onChange={(e) => setEditing({ ...editing, environment: e.target.value })}
                    placeholder="prod / staging / dev"
                  />
                </label>
                <label className="field">
                  <span className="field-label">标签</span>
                  <input
                    value={editing.tags ?? ''}
                    onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                    placeholder="逗号分隔，例如 core,high-traffic"
                  />
                </label>
                <label className="field full">
                  <span className="field-label">连接串（优先使用）</span>
                  <input
                    value={editing.connectionUri ?? ''}
                    onChange={(e) => setEditing({ ...editing, connectionUri: e.target.value })}
                    placeholder="例如 mysql://user:pwd@host:3306/db 或 mongodb://..."
                  />
                </label>
                <label className="field">
                  <span className="field-label">主机</span>
                  <input
                    value={editing.host ?? ''}
                    onChange={(e) => setEditing({ ...editing, host: e.target.value })}
                    placeholder="如 10.0.0.1"
                  />
                </label>
                <label className="field">
                  <span className="field-label">端口</span>
                  <input
                    type="number"
                    value={editing.port ?? ''}
                    onChange={(e) =>
                      setEditing({ ...editing, port: e.target.value ? Number(e.target.value) : undefined })
                    }
                    placeholder="3306 / 6379 / 27017"
                  />
                </label>
                <label className="field">
                  <span className="field-label">账号</span>
                  <input
                    value={editing.username ?? ''}
                    onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">密码</span>
                  <input
                    value={editing.password ?? ''}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                    type="password"
                  />
                </label>
                <label className="field">
                  <span className="field-label">库 / 命名空间</span>
                  <input
                    value={editing.databaseName ?? ''}
                    onChange={(e) => setEditing({ ...editing, databaseName: e.target.value })}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Mongo 认证库</span>
                  <input
                    value={editing.authSource ?? ''}
                    onChange={(e) => setEditing({ ...editing, authSource: e.target.value })}
                    placeholder="默认与库名一致"
                  />
                </label>
                <label className="field full">
                  <span className="field-label">备注</span>
                  <textarea
                    value={editing.description ?? ''}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    rows={3}
                    placeholder="补充说明、维护人、切换指引等"
                  />
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={closeModal}>
                取消
              </button>
              <button className="btn primary" onClick={saveAsset} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
