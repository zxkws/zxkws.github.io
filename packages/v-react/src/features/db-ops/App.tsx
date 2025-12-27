import { useCallback, useEffect, useRef, useState } from 'react';
import client from './http/client';
import GlobalLoading from './components/GlobalLoading';
import './styles.css';

type DbType = 'mysql' | 'redis' | 'mongodb';

type DbSyncScheduleType = 'fixed' | 'cron';
type DbSyncTaskStatus = 'running' | 'paused';

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

type DbSyncTask = {
  id: string;
  name: string;
  ownerUserId?: string;
  type: DbType;
  sourceAssetId: string;
  targetAssetId: string;
  scheduleType: DbSyncScheduleType;
  scheduleValue?: string;
  status: DbSyncTaskStatus;
  batchSize: number;
  concurrency: number;
  lastRunAt?: string | Date;
  nextRunAt?: string | Date;
  lastRunStatus?: string;
  lastRunMessage?: string;
  cts?: string;
  uts?: string;
};

type DbSyncRun = {
  id: string;
  ownerUserId: string;
  taskId: string;
  type: DbType;
  status: 'running' | 'success' | 'failed';
  startedAt: string | Date;
  finishedAt?: string | Date;
  metrics?: Record<string, unknown>;
  message?: string;
  cts?: string | Date;
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

const initialTaskForm: Omit<DbSyncTask, 'id'> = {
  name: '',
  type: 'mysql',
  sourceAssetId: '',
  targetAssetId: '',
  scheduleType: 'fixed',
  scheduleValue: '60',
  status: 'running',
  batchSize: 200,
  concurrency: 1,
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
  const [tasks, setTasks] = useState<DbSyncTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbAsset | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [taskEditing, setTaskEditing] = useState<(Omit<DbSyncTask, 'id'> & { id?: string }) | null>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({});
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [runTask, setRunTask] = useState<DbSyncTask | null>(null);
  const [isRunModalOpen, setRunModalOpen] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [runItems, setRunItems] = useState<DbSyncRun[]>([]);
  const [runTotal, setRunTotal] = useState(0);
  const [runPageNo, setRunPageNo] = useState(1);
  const [runPageSize] = useState(10);

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

  const loadTasks = useCallback(async () => {
    try {
      const data = unwrap<DbSyncTask[]>(await client('/db-sync/tasks/list', {}));
      setTasks(data);
    } catch (err) {
      // 同步任务属于增强功能，失败时不阻塞主功能
      setError((prev) => prev ?? (err instanceof Error ? err.message : '加载同步任务失败'));
    }
  }, [client]);

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
      loadTasks();
    }
  }, [authState, loadAssets, loadTasks]);

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

  const startCreateTask = () => {
    setTaskEditing({ ...initialTaskForm });
    setTaskModalOpen(true);
  };

  const startEditTask = (item: DbSyncTask) => {
    setTaskEditing({ ...item });
    setTaskModalOpen(true);
  };

  const closeTaskModal = () => {
    setTaskModalOpen(false);
    setTaskEditing(null);
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
    const confirmName =
      typeof window !== 'undefined'
        ? window.prompt(`二次确认：请输入名称【${item.name}】以删除`) || ''
        : item.name;
    if (confirmName.trim() !== item.name) {
      showToast('名称不一致，已取消删除');
      return;
    }
    try {
      await client('/db-assets/remove', { id: item.id, confirmName });
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

  const openRunModal = async (task: DbSyncTask) => {
    setRunTask(task);
    setRunModalOpen(true);
    await loadRuns(task.id, 1);
  };

  const closeRunModal = () => {
    setRunModalOpen(false);
    setRunTask(null);
    setRunItems([]);
    setRunTotal(0);
    setRunPageNo(1);
  };

  const loadRuns = useCallback(
    async (taskId: string, pageNo: number) => {
      setRunLoading(true);
      try {
        const payload = { taskId, pageNo, pageSize: runPageSize };
        const data = unwrap<{ items: DbSyncRun[]; total: number; pageNo: number; pageSize: number }>(
          await client('/db-sync/runs/list', payload),
        );
        setRunItems(data.items || []);
        setRunTotal(data.total || 0);
        setRunPageNo(data.pageNo || pageNo);
      } catch (err) {
        showToast(err instanceof Error ? err.message : '加载执行记录失败');
      } finally {
        setRunLoading(false);
      }
    },
    [client, runPageSize, showToast],
  );

  const saveTask = async () => {
    if (!taskEditing) return;
    if (!taskEditing.name?.trim()) {
      showToast('请填写任务名称');
      return;
    }
    if (!taskEditing.sourceAssetId || !taskEditing.targetAssetId) {
      showToast('请选择源/目标数据源');
      return;
    }
    if (taskEditing.sourceAssetId === taskEditing.targetAssetId) {
      showToast('源/目标不能相同');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...taskEditing,
        batchSize: Number(taskEditing.batchSize) || 200,
      };
      const endpoint = taskEditing.id ? '/db-sync/tasks/update' : '/db-sync/tasks/create';
      await client(endpoint, payload);
      closeTaskModal();
      showToast('任务保存成功');
      loadTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '任务保存失败');
    } finally {
      setSaving(false);
    }
  };

  const runTaskNow = async (task: DbSyncTask) => {
    setTaskBusyId(task.id);
    try {
      await client('/db-sync/tasks/run', { id: task.id, reason: 'manual' });
      showToast('已触发同步');
      loadTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '触发失败');
    } finally {
      setTaskBusyId(null);
    }
  };

  const toggleTaskStatus = async (task: DbSyncTask) => {
    setTaskBusyId(task.id);
    try {
      const endpoint = task.status === 'running' ? '/db-sync/tasks/pause' : '/db-sync/tasks/resume';
      await client(endpoint, { id: task.id });
      showToast(task.status === 'running' ? '已暂停' : '已启用');
      loadTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败');
    } finally {
      setTaskBusyId(null);
    }
  };

  const removeTask = async (task: DbSyncTask) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm(`确认删除同步任务【${task.name}】?`) : true;
    if (!confirmed) return;
    const confirmName =
      typeof window !== 'undefined'
        ? window.prompt(`二次确认：请输入名称【${task.name}】以删除`) || ''
        : task.name;
    if (confirmName.trim() !== task.name) {
      showToast('名称不一致，已取消删除');
      return;
    }
    setTaskBusyId(task.id);
    try {
      await client('/db-sync/tasks/remove', { id: task.id, confirmName });
      showToast('任务已删除');
      loadTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败');
    } finally {
      setTaskBusyId(null);
    }
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

        <div className="panel">
          <div className="toolbar">
            <div className="toolbar-left">
              <h3 style={{ margin: 0 }}>同步任务</h3>
              <span className="muted" style={{ marginLeft: 10 }}>
                支持同类型（MySQL/Redis/MongoDB）全量同步，支持定时与手动触发。
              </span>
            </div>
            <div className="toolbar-right">
              <button className="btn" onClick={loadTasks} disabled={authState !== 'ok'}>
                刷新任务
              </button>
              <button className="btn primary" onClick={startCreateTask} disabled={assets.length < 2}>
                新增任务
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div className="panel muted">暂无同步任务。</div>
          ) : (
            <div className="list">
              {tasks.map((t) => {
                const busy = taskBusyId === t.id;
                const source = assets.find((a) => a.id === t.sourceAssetId);
                const target = assets.find((a) => a.id === t.targetAssetId);
                return (
                  <div className="card" key={t.id}>
                    <div className="card-head">
                      <div className="card-title">
                        <span className={badgeClass(t.type)}>{t.type}</span>
                        <div>
                          <div className="name-row">
                            <span className="name">{t.name}</span>
                            <span className="pill">{t.status}</span>
                          </div>
                          <div className="sub">
                            源：{source?.name || t.sourceAssetId} → 目标：{target?.name || t.targetAssetId}
                          </div>
                        </div>
                      </div>
                      <div className="status">
                        <span className={statusClass(t.lastRunStatus)}></span>
                        <span className="status-text">{t.lastRunStatus ?? 'unknown'}</span>
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="grid">
                        <div>
                          <p className="label">调度</p>
                          <p className="value">
                            {t.scheduleType === 'fixed' ? `固定间隔：${t.scheduleValue || '--'} 分钟` : `Cron：${t.scheduleValue || '--'}`}
                          </p>
                        </div>
                        <div>
                          <p className="label">批次大小</p>
                          <p className="value">{t.batchSize}</p>
                        </div>
                        <div>
                          <p className="label">上次执行</p>
                          <p className="value">{formatTime(t.lastRunAt)}</p>
                        </div>
                        <div>
                          <p className="label">下次执行</p>
                          <p className="value">{formatTime(t.nextRunAt)}</p>
                        </div>
                      </div>
                      {t.lastRunMessage && (
                        <div className="note">
                          <strong>日志：</strong>
                          <span>{t.lastRunMessage}</span>
                        </div>
                      )}
                    </div>

                    <div className="card-foot">
                      <div className="meta">创建时间：{formatTime(t.cts)}</div>
                      <div className="actions">
                        <button className="btn ghost" onClick={() => runTaskNow(t)} disabled={busy}>
                          {busy ? '执行中...' : '立即同步'}
                        </button>
                        <button className="btn ghost" onClick={() => openRunModal(t)} disabled={busy}>
                          记录
                        </button>
                        <button className="btn ghost" onClick={() => toggleTaskStatus(t)} disabled={busy}>
                          {t.status === 'running' ? '暂停' : '启用'}
                        </button>
                        <button className="btn ghost" onClick={() => startEditTask(t)} disabled={busy}>
                          编辑
                        </button>
                        <button className="btn ghost" onClick={() => removeTask(t)} disabled={busy}>
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {isTaskModalOpen && taskEditing && (
        <div className="modal-mask">
          <div className="modal">
            <div className="modal-head">
              <h3>{taskEditing.id ? '编辑同步任务' : '新增同步任务'}</h3>
              <button className="link" onClick={closeTaskModal}>
                关闭
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <label className="field full">
                  <span className="field-label">任务名称 *</span>
                  <input
                    value={taskEditing.name}
                    onChange={(e) => setTaskEditing({ ...taskEditing, name: e.target.value })}
                    placeholder="例如：生产 MySQL 同步到灾备"
                  />
                </label>

                <label className="field">
                  <span className="field-label">类型 *</span>
                  <select
                    value={taskEditing.type}
                    onChange={(e) => setTaskEditing({ ...taskEditing, type: e.target.value as DbType })}
                  >
                    <option value="mysql">MySQL</option>
                    <option value="redis">Redis</option>
                    <option value="mongodb">MongoDB</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">源数据源 *</span>
                  <select
                    value={taskEditing.sourceAssetId}
                    onChange={(e) => setTaskEditing({ ...taskEditing, sourceAssetId: e.target.value })}
                  >
                    <option value="">请选择</option>
                    {assets
                      .filter((a) => a.id && a.type === taskEditing.type)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">目标数据源 *</span>
                  <select
                    value={taskEditing.targetAssetId}
                    onChange={(e) => setTaskEditing({ ...taskEditing, targetAssetId: e.target.value })}
                  >
                    <option value="">请选择</option>
                    {assets
                      .filter((a) => a.id && a.type === taskEditing.type)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">调度类型</span>
                  <select
                    value={taskEditing.scheduleType}
                    onChange={(e) => setTaskEditing({ ...taskEditing, scheduleType: e.target.value as DbSyncScheduleType })}
                  >
                    <option value="fixed">固定间隔</option>
                    <option value="cron">Cron</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field-label">
                    {taskEditing.scheduleType === 'fixed' ? '间隔（分钟）' : 'Cron 表达式'}
                  </span>
                  <input
                    value={taskEditing.scheduleValue ?? ''}
                    onChange={(e) => setTaskEditing({ ...taskEditing, scheduleValue: e.target.value })}
                    placeholder={taskEditing.scheduleType === 'fixed' ? '例如 60' : '例如 */5 * * * *'}
                  />
                </label>

                <label className="field">
                  <span className="field-label">批次大小</span>
                  <input
                    type="number"
                    value={taskEditing.batchSize ?? 200}
                    onChange={(e) => setTaskEditing({ ...taskEditing, batchSize: e.target.value ? Number(e.target.value) : 200 })}
                    placeholder="200"
                  />
                </label>

                <label className="field">
                  <span className="field-label">状态</span>
                  <select
                    value={taskEditing.status}
                    onChange={(e) => setTaskEditing({ ...taskEditing, status: e.target.value as DbSyncTaskStatus })}
                  >
                    <option value="running">running</option>
                    <option value="paused">paused</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={closeTaskModal}>
                取消
              </button>
              <button className="btn primary" onClick={saveTask} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRunModalOpen && runTask && (
        <div className="modal-mask">
          <div className="modal" style={{ maxWidth: 860 }}>
            <div className="modal-head">
              <h3>执行记录：{runTask.name}</h3>
              <button className="link" onClick={closeRunModal}>
                关闭
              </button>
            </div>
            <div className="modal-body">
              <div className="toolbar" style={{ padding: 0 }}>
                <div className="toolbar-left">
                  <span className="muted">
                    共 {runTotal} 条，页码 {runPageNo} / {Math.max(1, Math.ceil(runTotal / runPageSize))}
                  </span>
                </div>
                <div className="toolbar-right">
                  <button
                    className="btn"
                    onClick={() => loadRuns(runTask.id, Math.max(1, runPageNo - 1))}
                    disabled={runLoading || runPageNo <= 1}
                  >
                    上一页
                  </button>
                  <button
                    className="btn"
                    onClick={() => loadRuns(runTask.id, runPageNo + 1)}
                    disabled={runLoading || runPageNo >= Math.ceil(runTotal / runPageSize)}
                  >
                    下一页
                  </button>
                </div>
              </div>

              {runLoading ? (
                <div className="panel muted">加载中...</div>
              ) : runItems.length === 0 ? (
                <div className="panel muted">暂无执行记录。</div>
              ) : (
                <div className="list">
                  {runItems.map((r) => (
                    <div className="card" key={r.id}>
                      <div className="card-head">
                        <div className="card-title">
                          <span className={badgeClass(r.type)}>{r.type}</span>
                          <div>
                            <div className="name-row">
                              <span className="name">{r.status}</span>
                              <span className="pill">{formatTime(r.startedAt)}</span>
                            </div>
                            <div className="sub">
                              结束：{formatTime(r.finishedAt)}，ID：<span className="mono">{r.id}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        {r.metrics && (
                          <div className="note">
                            <strong>指标：</strong>
                            <span className="mono">{JSON.stringify(r.metrics)}</span>
                          </div>
                        )}
                        {r.message && (
                          <div className="note">
                            <strong>信息：</strong>
                            <span>{r.message}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={closeRunModal}>
                关闭
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
