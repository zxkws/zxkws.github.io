import { useCallback, useEffect, useState } from 'react';
import { getErrorStatus } from '@zxkws/shared-fetch';
import client from './http/client';
import GlobalLoading from './components/GlobalLoading';
import Tabs from './components/Tabs';
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

type DbSyncRunProgress = {
  phase?: string;
  stage?: string;
  tablesTotal?: number;
  tablesDone?: number;
  currentTable?: string;
  currentTableRowsCopied?: number;
  currentTableRowsEstimate?: number;
  rowsCopied?: number;
  rowsTotalEstimate?: number;
  collectionsTotal?: number;
  collectionsDone?: number;
  currentCollection?: string;
  currentCollectionDocsCopied?: number;
  docsCopied?: number;
  keysCopied?: number;
  elapsedMs?: number;
  etaFinishedAt?: string;
  updatedAt?: string;
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

type ConsoleTab = 'assets' | 'tasks';
type RunStatusFilter = 'all' | 'running' | 'success' | 'failed';

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

const formatDuration = (startedAt?: string | Date, finishedAt?: string | Date) => {
  if (!startedAt) return '--';
  const start = typeof startedAt === 'string' ? new Date(startedAt) : startedAt;
  const finishRaw = finishedAt ?? new Date();
  const finish = typeof finishRaw === 'string' ? new Date(finishRaw) : finishRaw;
  const ms = finish.getTime() - start.getTime();
  if (Number.isNaN(ms) || ms < 0) return '--';
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${min}m${rest}s`;
};

const extractRunProgress = (metrics?: Record<string, unknown>): DbSyncRunProgress | null => {
  if (!metrics || typeof metrics !== 'object') return null;
  const raw = (metrics as any).progress ?? metrics;
  if (!raw || typeof raw !== 'object') return null;
  return raw as DbSyncRunProgress;
};

const formatCount = (value?: unknown) => {
  const num = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(num)) return '--';
  return num.toLocaleString('zh-CN');
};

const formatProgressLine = (run: DbSyncRun) => {
  const p = extractRunProgress(run.metrics);
  if (!p) return null;

  const phaseLabel =
    p.phase === 'mysql' ? 'MySQL' : p.phase === 'mongodb' ? 'MongoDB' : p.phase === 'redis' ? 'Redis' : p.phase;
  const parts: string[] = [];
  if (phaseLabel) parts.push(String(phaseLabel));
  if (p.currentTable) parts.push(String(p.currentTable));
  if (p.currentCollection) parts.push(String(p.currentCollection));

  if (typeof p.tablesTotal === 'number') {
    parts.push(`表 ${formatCount(p.tablesDone ?? 0)}/${formatCount(p.tablesTotal)}`);
  } else if (typeof p.collectionsTotal === 'number') {
    parts.push(`集合 ${formatCount(p.collectionsDone ?? 0)}/${formatCount(p.collectionsTotal)}`);
  }

  if (typeof p.rowsTotalEstimate === 'number') {
    parts.push(`行 ${formatCount(p.rowsCopied ?? 0)}/${formatCount(p.rowsTotalEstimate)}`);
  } else if (typeof p.rowsCopied === 'number') {
    parts.push(`行 ${formatCount(p.rowsCopied)}`);
  } else if (typeof p.docsCopied === 'number') {
    parts.push(`文档 ${formatCount(p.docsCopied)}`);
  } else if (typeof p.keysCopied === 'number') {
    parts.push(`keys ${formatCount(p.keysCopied)}`);
  }

  if (p.etaFinishedAt) {
    parts.push(`预计结束 ${formatTime(p.etaFinishedAt)}`);
  }

  return parts.join(' · ');
};

const unwrap = <T,>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export default function App({ basename: _basename }: { basename?: string }) {
  const [authState, setAuthState] = useState<AuthState>('pending');
  const [activeTab, setActiveTab] = useState<ConsoleTab>('assets');
  const [filters, setFilters] = useState<FilterState>({ type: 'all', keyword: '' });
  const [assets, setAssets] = useState<DbAsset[]>([]);
  const [tasks, setTasks] = useState<DbSyncTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DbAsset | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [taskEditing, setTaskEditing] = useState<(Omit<DbSyncTask, 'id'> & { id?: string }) | null>(null);
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);
  const [secretVisible, setSecretVisible] = useState<Record<string, boolean>>({});
  const [taskBusyId, setTaskBusyId] = useState<string | null>(null);
  const [taskPanelTab, setTaskPanelTab] = useState<'detail' | 'runs'>('detail');
  const [runLoading, setRunLoading] = useState(false);
  const [runItems, setRunItems] = useState<DbSyncRun[]>([]);
  const [runTotal, setRunTotal] = useState(0);
  const [runPageNo, setRunPageNo] = useState(1);
  const [runPageSize] = useState(10);
  const [runStatusFilter, setRunStatusFilter] = useState<RunStatusFilter>('all');
  const [runningRuns, setRunningRuns] = useState<Record<string, DbSyncRun>>({});

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

  const loadTasks = useCallback(async () => {
    try {
      const data = unwrap<DbSyncTask[]>(await client('/v1/db-sync/tasks/list', {}));
      setTasks(data);
    } catch (err) {
      if (getErrorStatus(err) === 401) {
        setAuthState('need-login');
      }
      // 同步任务属于增强功能，失败时不阻塞主功能
      setError((prev) => prev ?? (err instanceof Error ? err.message : '加载同步任务失败'));
    }
  }, [client]);

  const loadRunningRuns = useCallback(async () => {
    try {
      const data = unwrap<{ items: DbSyncRun[]; total: number; pageNo: number; pageSize: number }>(
        await client('/v1/db-sync/runs/list', { status: 'running', pageNo: 1, pageSize: 50 }),
      );
      const map: Record<string, DbSyncRun> = {};
      (data.items || []).forEach((item) => {
        map[item.taskId] = item;
      });
      setRunningRuns(map);
    } catch (err) {
      if (getErrorStatus(err) === 401) {
        setAuthState('need-login');
        return;
      }
      // running runs 获取失败不影响主功能
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
      loadTasks();
      loadRunningRuns();
    }
  }, [authState, loadAssets, loadTasks, loadRunningRuns]);

  useEffect(() => {
    if (authState !== 'ok') return;
    if (typeof window === 'undefined') return;
    const timer = window.setInterval(() => {
      loadRunningRuns();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [authState, loadRunningRuns]);

  useEffect(() => {
    if (selectedAssetId && !assets.some((item) => item.id === selectedAssetId)) {
      setSelectedAssetId(null);
    }
  }, [assets, selectedAssetId]);

  useEffect(() => {
    if (selectedTaskId && !tasks.some((item) => item.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  }, [tasks, selectedTaskId]);

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
    loadTasks();
  }, [loadAssets, loadTasks]);

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
      typeof window !== 'undefined'
        ? window.prompt(`二次确认：请输入名称【${item.name}】以删除`) || ''
        : item.name;
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

  const selectTaskRow = (task: DbSyncTask) => {
    setSelectedTaskId(task.id);
    setRunItems([]);
    setRunTotal(0);
    setRunPageNo(1);
    setTaskPanelTab('detail');
  };

  const openTaskRuns = async (task: DbSyncTask) => {
    setActiveTab('tasks');
    setSelectedTaskId(task.id);
    setRunItems([]);
    setRunTotal(0);
    setRunPageNo(1);
    setTaskPanelTab('runs');
    await loadRuns(task.id, 1, runStatusFilter);
  };

  const loadRuns = useCallback(
    async (taskId: string, pageNo: number, status: RunStatusFilter) => {
      setRunLoading(true);
      try {
        const payload: Record<string, unknown> = { taskId, pageNo, pageSize: runPageSize };
        if (status !== 'all') {
          payload.status = status;
        }
        const data = unwrap<{ items: DbSyncRun[]; total: number; pageNo: number; pageSize: number }>(
          await client('/v1/db-sync/runs/list', payload),
        );
        setRunItems(data.items || []);
        setRunTotal(data.total || 0);
        setRunPageNo(data.pageNo || pageNo);
      } catch (err) {
        if (getErrorStatus(err) === 401) {
          setAuthState('need-login');
        }
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
      const endpoint = taskEditing.id ? '/v1/db-sync/tasks/update' : '/v1/db-sync/tasks/create';
	      await client(endpoint, payload);
	      closeTaskModal();
	      showToast('任务保存成功');
	      loadTasks();
	    } catch (err) {
	      if (getErrorStatus(err) === 401) {
	        setAuthState('need-login');
	      }
	      showToast(err instanceof Error ? err.message : '任务保存失败');
	    } finally {
	      setSaving(false);
	    }
	  };

	  const runTaskNow = async (task: DbSyncTask) => {
    setTaskBusyId(task.id);
	    try {
      await client('/v1/db-sync/tasks/run', { id: task.id, reason: 'manual' });
      showToast('已触发同步');
	      loadTasks();
	    } catch (err) {
	      if (getErrorStatus(err) === 401) {
	        setAuthState('need-login');
	      }
	      showToast(err instanceof Error ? err.message : '触发失败');
	    } finally {
	      setTaskBusyId(null);
	    }
	  };

	  const toggleTaskStatus = async (task: DbSyncTask) => {
    setTaskBusyId(task.id);
	    try {
      const endpoint = task.status === 'running' ? '/v1/db-sync/tasks/pause' : '/v1/db-sync/tasks/resume';
      await client(endpoint, { id: task.id });
      showToast(task.status === 'running' ? '已暂停' : '已启用');
	      loadTasks();
	    } catch (err) {
	      if (getErrorStatus(err) === 401) {
	        setAuthState('need-login');
	      }
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
	      await client('/v1/db-sync/tasks/remove', { id: task.id, confirmName });
	      showToast('任务已删除');
	      loadTasks();
	    } catch (err) {
	      if (getErrorStatus(err) === 401) {
	        setAuthState('need-login');
	      }
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

    const useNewLayout: boolean = true;

    if (useNewLayout) {
      const assetOnlineCount = assets.filter((item) => item.lastStatus === 'online').length;
      const assetOfflineCount = assets.filter((item) => item.lastStatus === 'offline').length;
      const taskRunningCount = tasks.filter((item) => item.status === 'running').length;
      const taskPausedCount = tasks.filter((item) => item.status === 'paused').length;

      const assetMap = new Map(assets.filter((a) => a.id).map((a) => [a.id as string, a] as const));
      const selectedAsset = selectedAssetId ? assetMap.get(selectedAssetId) ?? null : null;
      const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) ?? null : null;

      const getAssetName = (id?: string) => {
        if (!id) return '--';
        return assetMap.get(id)?.name ?? id;
      };

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
              <button className="btn" onClick={() => checkAsset()} disabled={checkingAll || loading || assets.length === 0}>
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
                      <td className="mono">{typeof item.lastLatencyMs === 'number' ? `${item.lastLatencyMs}ms` : '--'}</td>
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
                  <span style={{ marginLeft: 8, textTransform: 'uppercase' }}>{selectedAsset.lastStatus ?? 'unknown'}</span>
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
                  <span className="mono">{secretOpen ? selectedAsset.password || '--' : maskSecret(selectedAsset.password)}</span>
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

      const renderTasksMain = () => (
        <div className="table-panel">
          <div className="toolbar">
            <div className="toolbar-left">
              <button className="btn" onClick={loadTasks} disabled={authState !== 'ok'}>
                刷新任务
              </button>
            </div>
            <div className="toolbar-right">
              <button className="btn primary" onClick={startCreateTask} disabled={assets.length < 2}>
                新增任务
              </button>
            </div>
          </div>

          {tasks.length === 0 ? (
            <div style={{ padding: 14 }}>
              <div className="panel muted">暂无同步任务，点击「新增任务」开始配置。</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 96 }}>状态</th>
                  <th>任务</th>
                  <th style={{ width: 86 }}>类型</th>
                  <th>源 → 目标</th>
                  <th style={{ width: 160 }}>调度</th>
                  <th style={{ width: 160 }}>上次 / 下次</th>
                  <th style={{ width: 110 }}>最近结果</th>
                  <th style={{ width: 200, textAlign: 'right' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const selected = t.id === selectedTaskId;
                  const runningRun = runningRuns[t.id];
                  const busy = taskBusyId === t.id || Boolean(runningRun);
                  const progressLine = runningRun ? formatProgressLine(runningRun) : null;
                  const runningSummary = runningRun
                    ? `执行中：开始 ${formatTime(runningRun.startedAt)} · 已耗时 ${formatDuration(runningRun.startedAt)}${
                        progressLine ? ` · ${progressLine}` : ''
                      }`
                    : null;
                  const sourceName = getAssetName(t.sourceAssetId);
                  const targetName = getAssetName(t.targetAssetId);
                  const scheduleText =
                    t.scheduleType === 'fixed' ? `每 ${t.scheduleValue || '--'} 分钟` : `Cron：${t.scheduleValue || '--'}`;
                  return (
                    <tr key={t.id} className={selected ? 'selected' : ''} onClick={() => selectTaskRow(t)}>
                      <td>
                        <span className={`pill ${t.status === 'running' ? 'running' : ''}`}>{t.status}</span>
                      </td>
                      <td>
                        <div className="ellipsis" title={t.name}>
                          {t.name}
                        </div>
                        <div className="sub ellipsis" title={t.id}>
                          {t.id}
                        </div>
                        {runningSummary && (
                          <div className="sub ellipsis" title={runningSummary}>
                            {runningSummary}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={badgeClass(t.type)}>{t.type}</span>
                      </td>
                      <td className="ellipsis" title={`${sourceName} -> ${targetName}`}>
                        {sourceName} → {targetName}
                      </td>
                      <td className="mono ellipsis" title={scheduleText}>
                        {scheduleText}
                      </td>
                      <td className="mono">
                        <div title={`上次：${formatTime(t.lastRunAt)}`}>{formatTime(t.lastRunAt)}</div>
                        <div title={`下次：${formatTime(t.nextRunAt)}`}>{formatTime(t.nextRunAt)}</div>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            t.lastRunStatus === 'success' ? 'success' : t.lastRunStatus === 'failed' ? 'failed' : ''
                          }`}
                        >
                          {t.lastRunStatus ?? '--'}
                        </span>
                      </td>
                      <td>
                        <div className="cell-actions">
                          <button
                            className="link"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              runTaskNow(t);
                            }}
                          >
                            立即同步
                          </button>
                          <button
                            className="link"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskRuns(t);
                            }}
                          >
                            记录
                          </button>
                          <button
                            className="link"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskStatus(t);
                            }}
                          >
                            {t.status === 'running' ? '暂停' : '启用'}
                          </button>
                          <button
                            className="link"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTask(t);
                            }}
                          >
                            编辑
                          </button>
                          <button
                            className="link"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              removeTask(t);
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

      const renderTasksSide = () => {
        if (!selectedTask) {
          return (
            <div className="sidepanel">
              <div className="sidepanel-head">
                <div className="sidepanel-title">
                  <h3>任务详情</h3>
                </div>
              </div>
              <div className="sidepanel-body">
                <div className="panel muted">从左侧选择一条同步任务查看详情与执行记录。</div>
              </div>
            </div>
          );
        }

        const runningRun = runningRuns[selectedTask.id];
        const busy = taskBusyId === selectedTask.id || Boolean(runningRun);
        const progressLine = runningRun ? formatProgressLine(runningRun) : null;
        const runningSummary = runningRun
          ? `执行中：开始 ${formatTime(runningRun.startedAt)} · 已耗时 ${formatDuration(runningRun.startedAt)}${
              progressLine ? ` · ${progressLine}` : ''
            }`
          : null;
        const sourceName = getAssetName(selectedTask.sourceAssetId);
        const targetName = getAssetName(selectedTask.targetAssetId);
        const totalPages = Math.max(1, Math.ceil(runTotal / runPageSize));

        const openRuns = () => {
          setTaskPanelTab('runs');
          loadRuns(selectedTask.id, 1, runStatusFilter);
        };

        return (
          <div className="sidepanel">
            <div className="sidepanel-head">
              <div className="sidepanel-title">
                <span className={badgeClass(selectedTask.type)}>{selectedTask.type}</span>
                <h3 title={selectedTask.name}>{selectedTask.name}</h3>
              </div>
              <div className="cell-actions">
                <button className="link" onClick={() => startEditTask(selectedTask)} disabled={busy}>
                  编辑
                </button>
                <button className="link" onClick={() => removeTask(selectedTask)} disabled={busy}>
                  删除
                </button>
              </div>
            </div>
            <div className="sidepanel-body">
              <Tabs
                items={[
                  { key: 'detail', label: '详情' },
                  { key: 'runs', label: '记录', badge: runTotal > 0 ? runTotal : undefined },
                ]}
                activeKey={taskPanelTab}
                onChange={(key) => {
                  const next = key as 'detail' | 'runs';
                  setTaskPanelTab(next);
                  if (next === 'runs') {
                    loadRuns(selectedTask.id, 1, runStatusFilter);
                  }
                }}
              />

              {taskPanelTab === 'detail' ? (
                <>
                  <div className="cell-actions" style={{ justifyContent: 'flex-start', marginBottom: 10 }}>
                    <button className="btn primary" onClick={() => runTaskNow(selectedTask)} disabled={busy}>
                      {busy ? '执行中...' : '立即同步'}
                    </button>
                    <button className="btn" onClick={() => toggleTaskStatus(selectedTask)} disabled={busy}>
                      {selectedTask.status === 'running' ? '暂停' : '启用'}
                    </button>
                    <button className="btn" onClick={openRuns} disabled={busy}>
                      查看记录
                    </button>
                  </div>

                  {runningSummary && <div className="panel muted">{runningSummary}</div>}

                  <div className="kv">
                    <div className="k">状态</div>
                    <div className="v">
                      <span className={`pill ${selectedTask.status === 'running' ? 'running' : ''}`}>{selectedTask.status}</span>
                    </div>

                    <div className="k">源</div>
                    <div className="v ellipsis" title={sourceName}>
                      {sourceName}
                    </div>

                    <div className="k">目标</div>
                    <div className="v ellipsis" title={targetName}>
                      {targetName}
                    </div>

                    <div className="k">调度</div>
                    <div className="v">
                      {selectedTask.scheduleType === 'fixed'
                        ? `固定间隔：${selectedTask.scheduleValue || '--'} 分钟`
                        : `Cron：${selectedTask.scheduleValue || '--'}`}
                    </div>

                    <div className="k">批次大小</div>
                    <div className="v mono">{selectedTask.batchSize}</div>

                    <div className="k">并发</div>
                    <div className="v mono">{selectedTask.concurrency}</div>

                    <div className="k">上次执行</div>
                    <div className="v mono">{formatTime(selectedTask.lastRunAt)}</div>

                    <div className="k">下次执行</div>
                    <div className="v mono">{formatTime(selectedTask.nextRunAt)}</div>

                    <div className="k">最近结果</div>
                    <div className="v">
                      <span
                        className={`pill ${
                          selectedTask.lastRunStatus === 'success'
                            ? 'success'
                            : selectedTask.lastRunStatus === 'failed'
                              ? 'failed'
                              : ''
                        }`}
                      >
                        {selectedTask.lastRunStatus ?? '--'}
                      </span>
                    </div>

                    <div className="k">任务 ID</div>
                    <div className="v mono">{selectedTask.id}</div>
                  </div>

                  {selectedTask.lastRunMessage && (
                    <>
                      <div className="divider"></div>
                      <div className="panel muted">{selectedTask.lastRunMessage}</div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="toolbar" style={{ marginBottom: 10 }}>
                    <div className="toolbar-left">
                      <label className="field" style={{ minWidth: 140 }}>
                        <span className="field-label">状态</span>
                        <select
                          value={runStatusFilter}
                          onChange={(e) => {
                            const next = e.target.value as RunStatusFilter;
                            setRunStatusFilter(next);
                            loadRuns(selectedTask.id, 1, next);
                          }}
                        >
                          <option value="all">全部</option>
                          <option value="running">running</option>
                          <option value="success">success</option>
                          <option value="failed">failed</option>
                        </select>
                      </label>
                    </div>
                    <div className="toolbar-right">
                      <span className="muted" style={{ fontSize: 12 }}>
                        共 {runTotal} 条，{runPageNo}/{totalPages}
                      </span>
                      <button
                        className="btn"
                        onClick={() => loadRuns(selectedTask.id, Math.max(1, runPageNo - 1), runStatusFilter)}
                        disabled={runLoading || runPageNo <= 1}
                      >
                        上一页
                      </button>
                      <button
                        className="btn"
                        onClick={() => loadRuns(selectedTask.id, runPageNo + 1, runStatusFilter)}
                        disabled={runLoading || runPageNo >= totalPages}
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
                    <div className="table-panel">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: 96 }}>状态</th>
                            <th style={{ width: 160 }}>开始</th>
                            <th style={{ width: 80 }}>耗时</th>
                            <th>信息</th>
                          </tr>
                        </thead>
                        <tbody>
                          {runItems.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <span
                                  className={`pill ${
                                    r.status === 'success' ? 'success' : r.status === 'failed' ? 'failed' : 'running'
                                  }`}
                                >
                                  {r.status}
                                </span>
                              </td>
                              <td className="mono">{formatTime(r.startedAt)}</td>
                              <td className="mono">{formatDuration(r.startedAt, r.finishedAt)}</td>
                              <td>
                                <div className="ellipsis" title={r.message || ''}>
                                  {r.message || '--'}
                                </div>
                                {(() => {
                                  const progressLine = formatProgressLine(r);
                                  if (progressLine) {
                                    return (
                                      <div className="sub mono ellipsis" title={progressLine}>
                                        {progressLine}
                                      </div>
                                    );
                                  }
                                  if (r.metrics) {
                                    return (
                                      <div className="sub mono ellipsis" title={JSON.stringify(r.metrics)}>
                                        {JSON.stringify(r.metrics)}
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
            <div className="stat">
              <div className="k">同步任务总数</div>
              <div className="v">{tasks.length}</div>
            </div>
            <div className="stat">
              <div className="k">运行中 / 暂停</div>
              <div className="v">
                {taskRunningCount} / {taskPausedCount}
              </div>
            </div>
          </div>

          <Tabs
            items={[
              { key: 'assets', label: '数据源', badge: assets.length },
              { key: 'tasks', label: '同步任务', badge: tasks.length },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as ConsoleTab)}
          />

          {error && <div className="panel danger">{error}</div>}

          <div className="workspace">
            <div className="workspace-main">{activeTab === 'assets' ? renderAssetsMain() : renderTasksMain()}</div>
            <div className="workspace-side">{activeTab === 'assets' ? renderAssetsSide() : renderTasksSide()}</div>
          </div>
        </>
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
	                const runningRun = runningRuns[t.id];
	                const busy = taskBusyId === t.id || Boolean(runningRun);
	                const progressLine = runningRun ? formatProgressLine(runningRun) : null;
	                const runningSummary = runningRun
	                  ? `执行中：开始 ${formatTime(runningRun.startedAt)} · 已耗时 ${formatDuration(runningRun.startedAt)}${
	                      progressLine ? ` · ${progressLine}` : ''
	                    }`
	                  : null;
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
	                      {runningSummary && <div className="panel muted">{runningSummary}</div>}
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
                        <button className="btn ghost" onClick={() => openTaskRuns(t)} disabled={busy}>
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
          <button className="btn" onClick={startCreateTask} disabled={authState !== 'ok' || assets.length < 2}>
            新增任务
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

      {toast && <div className="toast">{toast}</div>}
      <GlobalLoading />
    </div>
  );
}
