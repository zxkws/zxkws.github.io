import { useCallback, useEffect, useState } from 'react';
import { getErrorStatus } from '@zxkws/shared-fetch';
import client from './http/client';
import GlobalLoading from './components/GlobalLoading';
import './styles.css';

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
  role?: string; // 兼容旧字段
  roles?: string[]; // 新结构，可能是字符串数组
};

type AuthState = 'pending' | 'ok' | 'need-login' | 'forbidden' | 'error';

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

const buildAssetAddress = (asset: DbAsset) => {
  if (asset.connectionUri) return asset.connectionUri;
  const host = asset.host?.trim();
  if (!host) return '';
  const portPart = asset.port ? `:${asset.port}` : '';
  const dbPart = asset.databaseName ? `/${asset.databaseName}` : '';
  return `${host}${portPart}${dbPart}`;
};

const maskAddressForDisplay = (address: string) => {
  if (!address) return address;
  const schemeIndex = address.indexOf('://');
  if (schemeIndex < 0) return address;
  const afterScheme = address.slice(schemeIndex + 3);
  const atIndex = afterScheme.indexOf('@');
  if (atIndex < 0) return address;
  const auth = afterScheme.slice(0, atIndex);
  const rest = afterScheme.slice(atIndex);
  const colonIndex = auth.indexOf(':');
  if (colonIndex < 0) return address;
  const user = auth.slice(0, colonIndex);
  return `${address.slice(0, schemeIndex + 3)}${user}:***${rest}`;
};

const unwrap = <T,>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export default function App({ basename: _basename }: { basename?: string }) {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [filters, setFilters] = useState<FilterState>({ type: 'all', keyword: '' });
  const [assets, setAssets] = useState<DbAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbAsset | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({});

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
      const data = unwrap<DbAsset[]>(await client('/v1/db-assets/list', payload));
      setAssets(data);
    } catch (err) {
      if (getErrorStatus(err) === 401) {
        setAuthState('need-login');
      }
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [client, filters]);

  const loadProfile = useCallback(async () => {
    setAuthState('pending');
    try {
      const info = unwrap<UserProfile>(await client('/v1/user', undefined, { method: 'GET' }));

      const isAdmin =
        info.role === 'admin' ||
        (Array.isArray(info.roles) && info.roles.find((item) => (item as any).code === 'admin'));

      if (!isAdmin) {
        setAuthState('forbidden');
        return;
      }
      setAuthState('ok');
      setError(null);
    } catch (err) {
      const status = getErrorStatus(err);
      if (status === 401) {
        setAuthState('need-login');
        setError(err instanceof Error ? err.message : '登录已失效，请重新登录');
        return;
      }
      if (status === 403) {
        setAuthState('forbidden');
        setError(err instanceof Error ? err.message : '权限不足');
        return;
      }
      setAuthState('error');
      setError(err instanceof Error ? err.message : '服务暂不可用，请稍后重试');
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

  useEffect(() => {
    if (selectedAssetId && !assets.some((item) => item.id === selectedAssetId)) {
      setSelectedAssetId(null);
    }
  }, [assets, selectedAssetId]);

  const copyToClipboard = useCallback(
    async (text: string, okMessage = '已复制') => {
      if (!text.trim()) {
        showToast('无可复制内容');
        return;
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else if (typeof document !== 'undefined') {
          const input = document.createElement('textarea');
          input.value = text;
          input.style.position = 'fixed';
          input.style.left = '-9999px';
          input.style.top = '0';
          input.style.opacity = '0';
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
        }
        showToast(okMessage);
      } catch {
        showToast('复制失败');
      }
    },
    [showToast],
  );

  const refreshAll = useCallback(() => {
    loadAssets();
  }, [loadAssets]);

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
      const endpoint = editing.id ? '/v1/db-assets/update' : '/v1/db-assets/create';
      await client(endpoint, payload);
      closeModal();
      showToast('保存成功');
      loadAssets();
    } catch (err) {
      if (getErrorStatus(err) === 401) {
        setAuthState('need-login');
      }
      showToast(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = async (item: DbAsset) => {
    if (!item.id) return;
    const confirmed = typeof window !== 'undefined' ? window.confirm(`确认删除【${item.name}】?`) : true;
    if (!confirmed) return;
    const confirmName =
      typeof window !== 'undefined' ? window.prompt(`二次确认：请输入名称【${item.name}】以删除`) || '' : item.name;
    if (confirmName.trim() !== item.name) {
      showToast('名称不一致，已取消删除');
      return;
    }
    try {
      await client('/v1/db-assets/remove', { id: item.id, confirmName });
      showToast('已删除');
      loadAssets();
    } catch (err) {
      if (getErrorStatus(err) === 401) {
        setAuthState('need-login');
      }
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
      const results = unwrap<CheckResult[]>(await client('/v1/db-assets/check', payload));
      mergeCheck(results);
      showToast('检查完成');
    } catch (err) {
      if (getErrorStatus(err) === 401) {
        setAuthState('need-login');
      }
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

  const selectAssetRow = (item: DbAsset) => {
    if (!item.id) return;
    setSelectedAssetId(item.id);
  };

  const goLogin = () => {
    if (typeof window === 'undefined') return;
    const current = window.location.href;
    const isDev = import.meta.env.MODE === 'development';
    const base = isDev ? 'http://localhost:5183' : `${window.location.origin}/auth-app`;
    window.location.href = `${base}/#/login?redirect=${encodeURIComponent(current)}`;
  };

  const renderContent = () => {
    if (authState === 'pending') {
      return <div className="panel muted">正在校验权限...</div>;
    }

    if (authState === 'need-login') {
      return (
        <div className="panel danger">
          <h3>登录已失效</h3>
          <p>后端接口返回未登录/登录过期，请重新登录后再试。</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn primary" onClick={goLogin}>
              去登录
            </button>
            <button className="btn" onClick={loadProfile}>
              重试
            </button>
          </div>
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

    if (authState === 'error') {
      return (
        <div className="panel danger">
          <h3>服务异常</h3>
          <p>{error || '服务暂不可用，请稍后重试。'}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn primary" onClick={loadProfile}>
              重试
            </button>
          </div>
        </div>
      );
    }

    const assetOnlineCount = assets.filter((item) => item.lastStatus === 'online').length;
    const assetOfflineCount = assets.filter((item) => item.lastStatus === 'offline').length;

    const assetMap = new Map(assets.filter((a) => a.id).map((a) => [a.id as string, a] as const));
    const selectedAsset = selectedAssetId ? (assetMap.get(selectedAssetId) ?? null) : null;

    const renderAssetsMain = () => (
      <div className="table-panel">
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

        {loading ? (
          <div style={{ padding: 14 }}>
            <div className="panel muted">加载中...</div>
          </div>
        ) : assets.length === 0 ? (
          <div style={{ padding: 14 }}>
            <div className="panel muted">暂无数据源，点击「新增数据源」开始配置。</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 76 }}>状态</th>
                <th>名称</th>
                <th style={{ width: 86 }}>类型</th>
                <th style={{ width: 86 }}>环境</th>
                <th>地址 / DB</th>
                <th style={{ width: 96 }}>延迟</th>
                <th style={{ width: 160 }}>上次检查</th>
                <th style={{ width: 160, textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((item) => {
                const selected = item.id && item.id === selectedAssetId;
                const addr = buildAssetAddress(item);
                const displayAddr = maskAddressForDisplay(addr);
                return (
                  <tr
                    key={item.id ?? item.name}
                    className={selected ? 'selected' : ''}
                    onClick={() => selectAssetRow(item)}
                  >
                    <td>
                      <span className={statusClass(item.lastStatus)}></span>
                      <span style={{ marginLeft: 8, textTransform: 'uppercase' }}>{item.lastStatus ?? 'unknown'}</span>
                    </td>
                    <td>
                      <div className="ellipsis" title={item.name}>
                        {item.name}
                      </div>
                      {item.tags && (
                        <div className="sub ellipsis" title={item.tags}>
                          {item.tags}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={badgeClass(item.type)}>{item.type}</span>
                    </td>
                    <td>{item.environment ?? '--'}</td>
                    <td>
                      <div className="mono ellipsis" title={displayAddr || '--'}>
                        {displayAddr || '--'}
                      </div>
                    </td>
                    <td className="mono">
                      {typeof item.lastLatencyMs === 'number' ? `${item.lastLatencyMs}ms` : '--'}
                    </td>
                    <td className="mono">{formatTime(item.lastCheckedAt)}</td>
                    <td>
                      <div className="cell-actions">
                        <button
                          className="link"
                          onClick={(e) => {
                            e.stopPropagation();
                            checkAsset(item.id);
                          }}
                          disabled={checkingId === item.id}
                        >
                          {checkingId === item.id ? '检查中' : '检查'}
                        </button>
                        <button
                          className="link"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(addr, '已复制连接信息');
                          }}
                        >
                          复制
                        </button>
                        <button
                          className="link"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(item);
                          }}
                        >
                          编辑
                        </button>
                        <button
                          className="link"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAsset(item);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );

    const renderAssetsSide = () => {
      if (!selectedAsset) {
        return (
          <div className="sidepanel">
            <div className="sidepanel-head">
              <div className="sidepanel-title">
                <h3>数据源详情</h3>
              </div>
            </div>
            <div className="sidepanel-body">
              <div className="panel muted">从左侧选择一条数据源查看详情。</div>
            </div>
          </div>
        );
      }

      const addr = buildAssetAddress(selectedAsset);
      const displayAddr = maskAddressForDisplay(addr);
      const secretOpen = selectedAsset.id ? secretVisible[selectedAsset.id] : false;

      return (
        <div className="sidepanel">
          <div className="sidepanel-head">
            <div className="sidepanel-title">
              <span className={badgeClass(selectedAsset.type)}>{selectedAsset.type}</span>
              <h3 title={selectedAsset.name}>{selectedAsset.name}</h3>
            </div>
            <div className="cell-actions">
              <button className="link" onClick={() => startEdit(selectedAsset)}>
                编辑
              </button>
              <button className="link" onClick={() => removeAsset(selectedAsset)}>
                删除
              </button>
            </div>
          </div>
          <div className="sidepanel-body">
            <div className="cell-actions" style={{ justifyContent: 'flex-start', marginBottom: 10 }}>
              <button
                className="btn"
                onClick={() => checkAsset(selectedAsset.id)}
                disabled={checkingId === selectedAsset.id || checkingAll}
              >
                {checkingId === selectedAsset.id ? '检查中...' : '测试连接'}
              </button>
              <button className="btn" onClick={() => copyToClipboard(addr, '已复制连接信息')}>
                复制连接
              </button>
            </div>

            <div className="kv">
              <div className="k">状态</div>
              <div className="v">
                <span className={statusClass(selectedAsset.lastStatus)}></span>
                <span style={{ marginLeft: 8, textTransform: 'uppercase' }}>
                  {selectedAsset.lastStatus ?? 'unknown'}
                </span>
                {typeof selectedAsset.lastLatencyMs === 'number' && (
                  <span className="mono" style={{ marginLeft: 8, color: 'var(--muted)' }}>
                    {selectedAsset.lastLatencyMs}ms
                  </span>
                )}
              </div>

              <div className="k">地址</div>
              <div className="v">
                <div className="mono ellipsis" title={displayAddr || '--'}>
                  {displayAddr || '--'}
                </div>
              </div>

              <div className="k">账号</div>
              <div className="v">{selectedAsset.username || '--'}</div>

              <div className="k">密码</div>
              <div className="v">
                <span className="mono">
                  {secretOpen ? selectedAsset.password || '--' : maskSecret(selectedAsset.password)}
                </span>
                {selectedAsset.id && selectedAsset.password && (
                  <button className="link" onClick={() => toggleSecret(selectedAsset.id)} style={{ marginLeft: 10 }}>
                    {secretOpen ? '隐藏' : '显示'}
                  </button>
                )}
              </div>

              <div className="k">环境</div>
              <div className="v">{selectedAsset.environment || '--'}</div>

              <div className="k">库 / 命名空间</div>
              <div className="v">{selectedAsset.databaseName || '--'}</div>

              <div className="k">标签</div>
              <div className="v">
                <div className="ellipsis" title={selectedAsset.tags || '--'}>
                  {selectedAsset.tags || '--'}
                </div>
              </div>

              <div className="k">备注</div>
              <div className="v">
                <div className="ellipsis" title={selectedAsset.description || '--'}>
                  {selectedAsset.description || '--'}
                </div>
              </div>

              <div className="k">上次检查</div>
              <div className="v mono">{formatTime(selectedAsset.lastCheckedAt)}</div>
            </div>

            {selectedAsset.lastMessage && (
              <>
                <div className="divider"></div>
                <div className="panel muted">{selectedAsset.lastMessage}</div>
              </>
            )}
          </div>
        </div>
      );
    };

    return (
      <>
        <div className="summary-grid">
          <div className="stat">
            <div className="k">数据源总数</div>
            <div className="v">{assets.length}</div>
          </div>
          <div className="stat">
            <div className="k">在线 / 离线</div>
            <div className="v">
              {assetOnlineCount} / {assetOfflineCount}
            </div>
          </div>
        </div>

        {error && <div className="panel danger">{error}</div>}

        <div className="workspace">
          <div className="workspace-main">{renderAssetsMain()}</div>
          <div className="workspace-side">{renderAssetsSide()}</div>
        </div>
      </>
    );
  };

  return (
    <div className="dbops-root">
      <header className="page-header">
        <div>
          <h1>数据库管控台</h1>
          <p className="sub">集中管理 MySQL / Redis / MongoDB 的配置与健康状态。仅限管理员访问。</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={refreshAll} disabled={loading}>
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
      <GlobalLoading />
    </div>
  );
}
