import { useEffect, useMemo, useState } from 'react';
import PageLoading from '../../components/PageLoading';
import { useUser } from '../../context/UserContext';
import {
  type AgentTask,
  type AgentTaskCondition,
  type AgentTaskEvent,
  createAgentTask,
  createMcpConnection,
  deleteMcpConnection,
  executeAgentTask,
  fetchVapidPublicKey,
  importMcpConnection,
  listAgentTaskEvents,
  listAgentTasks,
  listMcpConnections,
  listPushSubscriptions,
  type McpConnection,
  type PushSubscriptionPayload,
  parseTaskByNl,
  savePushSubscription,
  updateMcpConnection,
} from '../../services/agentTaskService';

const inlineSwSource = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evt) => evt.waitUntil(self.clients.claim()));
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "通知", body: "你有新的提醒" };
  const title = data.title || "通知";
  const options = {
    body: data.body || "你有新的提醒",
    icon: "/favicon.ico",
    data: data.url ? { url: data.url } : {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app/agent-tasks";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});
`;

const defaultCondition: AgentTaskCondition = {
  sourceType: 'mcp',
  comparator: 'contains',
  joinLogic: 'and',
};

const pretty = (obj: unknown) => JSON.stringify(obj, null, 2);

const safeJsonStringify = (value: unknown) => {
  if (value === undefined) return '';
  if (value === null) return 'null';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
};

const safeJsonParse = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return JSON.parse(trimmed);
};

const normalizeJsonObjectOrArray = (raw: unknown): Record<string, unknown> | unknown[] | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return undefined;
};

const normalizeJsonObject = (raw: unknown): Record<string, unknown> | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return undefined;
};

const extractToolList = (raw: unknown): Array<{ id: string; name?: string; description?: string }> => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((t) => {
        if (!t || typeof t !== 'object') return null;
        const record = t as Record<string, unknown>;
        const id = String(record.id ?? record.name ?? '').trim();
        if (!id) return null;
        return {
          id,
          name: typeof record.name === 'string' ? record.name : undefined,
          description: typeof record.description === 'string' ? record.description : undefined,
        };
      })
      .filter(Boolean) as Array<{ id: string; name?: string; description?: string }>;
  }

  if (typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (Array.isArray(record.tools)) {
      return extractToolList(record.tools);
    }
    return Object.entries(record)
      .map(([id, v]) => {
        if (!id) return null;
        if (v && typeof v === 'object') {
          const r = v as Record<string, unknown>;
          return {
            id,
            name: typeof r.name === 'string' ? r.name : undefined,
            description: typeof r.description === 'string' ? r.description : undefined,
          };
        }
        return { id, name: undefined, description: undefined };
      })
      .filter(Boolean) as Array<{ id: string; name?: string; description?: string }>;
  }

  return [];
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

type ParseResult = { raw: string; parsed: Record<string, unknown> } | null;
type ParseSchema = {
  title?: string;
  schedule?: { type?: 'fixed' | 'cron' | 'event'; value?: string };
  expires_at?: string;
  conditions?: AgentTaskCondition[];
};

const AgentTaskPage = () => {
  const { user, loading: userLoading } = useUser();
  const [nlText, setNlText] = useState('如果明天北京下雨，早上8点提醒我');
  const [parseResult, setParseResult] = useState<ParseResult>(null);
  const [parseLoading, setParseLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [scheduleType, setScheduleType] = useState<'fixed' | 'cron' | 'event'>('fixed');
  const [scheduleValue, setScheduleValue] = useState('5');
  const [expiresAt, setExpiresAt] = useState('');
  const [conditions, setConditions] = useState<AgentTaskCondition[]>([{ ...defaultCondition }]);
  const [taskList, setTaskList] = useState<AgentTask[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [execLoadingId, setExecLoadingId] = useState<string | null>(null);
  const [mcpConnections, setMcpConnections] = useState<McpConnection[]>([]);
  const [connEditingId, setConnEditingId] = useState<string | null>(null);
  const [connName, setConnName] = useState('');
  const [connServerUrl, setConnServerUrl] = useState('');
  const [connStatus, setConnStatus] = useState('active');
  const [connToolsText, setConnToolsText] = useState('');
  const [connCredsText, setConnCredsText] = useState('');
  const [connSaving, setConnSaving] = useState(false);
  const [connError, setConnError] = useState<string>('');
  const [importConfigJson, setImportConfigJson] = useState('');
  const [importServerName, setImportServerName] = useState('');
  const [importNameOverride, setImportNameOverride] = useState('');
  const [importing, setImporting] = useState(false);

  const [subs, setSubs] = useState<PushSubscriptionPayload[]>([]);
  const [pushStatus, setPushStatus] = useState<string>('');
  const [vapidKey, setVapidKey] = useState<string | null | undefined>(undefined);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [taskEvents, setTaskEvents] = useState<AgentTaskEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string>('');
  const inlineSwUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const blob = new Blob([inlineSwSource], { type: 'application/javascript' });
    return URL.createObjectURL(blob);
  }, []);

  const toolOptions = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    mcpConnections.forEach((conn) => {
      const tools = extractToolList(conn.tools);
      tools.forEach((tool) => {
        const id = tool.id || '';
        if (id) {
          list.push({
            id,
            label: `${conn.name}: ${tool.name || tool.id || id}`,
          });
        }
      });
    });
    return list;
  }, [mcpConnections]);

  const loadTasks = async () => {
    setTaskLoading(true);
    try {
      const data = await listAgentTasks();
      setTaskList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setTaskLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const data = await listMcpConnections();
      setMcpConnections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const resetConnForm = () => {
    setConnEditingId(null);
    setConnName('');
    setConnServerUrl('');
    setConnStatus('active');
    setConnToolsText('');
    setConnCredsText('');
    setConnError('');
  };

  const resetImportForm = () => {
    setImportConfigJson('');
    setImportServerName('');
    setImportNameOverride('');
  };

  const startEditConn = (conn: McpConnection) => {
    setConnEditingId(conn.id);
    setConnName(conn.name || '');
    setConnServerUrl(conn.serverUrl || '');
    setConnStatus(conn.status || 'active');
    setConnToolsText(safeJsonStringify(conn.tools));
    setConnCredsText(safeJsonStringify(conn.credentials));
    setConnError('');
  };

  const saveConn = async () => {
    setConnSaving(true);
    setConnError('');
    try {
      const parsedTools = connToolsText.trim() ? safeJsonParse(connToolsText) : undefined;
      const parsedCreds = connCredsText.trim() ? safeJsonParse(connCredsText) : undefined;
      const payload = {
        name: connName.trim(),
        serverUrl: connServerUrl.trim(),
        status: connStatus.trim() || 'active',
        tools: normalizeJsonObjectOrArray(parsedTools),
        credentials: normalizeJsonObject(parsedCreds),
      };

      if (!payload.name) throw new Error('连接名不能为空');
      if (!payload.serverUrl) throw new Error('serverUrl 不能为空');

      if (connEditingId) {
        await updateMcpConnection(connEditingId, payload);
      } else {
        await createMcpConnection(payload);
      }
      await loadConnections();
      resetConnForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '保存失败';
      setConnError(msg);
    } finally {
      setConnSaving(false);
    }
  };

  const doImportConn = async () => {
    setImporting(true);
    setConnError('');
    try {
      const configJson = importConfigJson.trim();
      if (!configJson) throw new Error('请粘贴 MCP JSON 配置');
      await importMcpConnection({
        configJson,
        serverName: importServerName.trim() || undefined,
        nameOverride: importNameOverride.trim() || undefined,
      });
      await loadConnections();
      resetImportForm();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '导入失败';
      setConnError(msg);
    } finally {
      setImporting(false);
    }
  };

  const removeConn = async (id: string) => {
    if (!window.confirm('确认删除该 MCP 连接？')) return;
    try {
      await deleteMcpConnection(id);
      if (connEditingId === id) {
        resetConnForm();
      }
      await loadConnections();
    } catch (error) {
      setConnError(error instanceof Error ? error.message : '删除失败');
    }
  };

  const loadEvents = async (taskId: string) => {
    setSelectedTaskId(taskId);
    setEventsLoading(true);
    setEventsError('');
    try {
      const data = await listAgentTaskEvents(taskId);
      setTaskEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      setTaskEvents([]);
      setEventsError(error instanceof Error ? error.message : '加载事件失败');
    } finally {
      setEventsLoading(false);
    }
  };

  const loadSubs = async () => {
    try {
      const data = await listPushSubscriptions();
      setSubs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadVapidKey = async () => {
    try {
      const remoteKey = await fetchVapidPublicKey();
      setVapidKey(remoteKey ?? null);
    } catch (error) {
      console.error(error);
      setVapidKey(null);
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      loadTasks();
      loadConnections();
      loadSubs();
      loadVapidKey();
    }
  }, [user, userLoading]);

  const handleParse = async () => {
    setParseLoading(true);
    try {
      const res = await parseTaskByNl(nlText);
      setParseResult(res as ParseResult);
      const parsed = res?.parsed as ParseSchema | undefined;
      if (parsed) {
        if (parsed.title) setTitle(parsed.title);
        if (parsed.schedule?.type) setScheduleType(parsed.schedule.type);
        if (parsed.schedule?.value) setScheduleValue(parsed.schedule.value);
        if (parsed.expires_at) setExpiresAt(parsed.expires_at);
        if (Array.isArray(parsed.conditions) && parsed.conditions.length > 0) setConditions(parsed.conditions);
      }
    } catch (error) {
      setParseResult(null);
      console.error(error);
    } finally {
      setParseLoading(false);
    }
  };

  const updateCondition = (index: number, patch: Partial<AgentTaskCondition>) => {
    setConditions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addCondition = () => setConditions((prev) => [...prev, { ...defaultCondition }]);
  const removeCondition = (index: number) => setConditions((prev) => prev.filter((_, i) => i !== index));

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createAgentTask({
        title: title || '新建任务',
        intentRaw: nlText,
        intentStruct: parseResult?.parsed ?? null,
        scheduleType,
        scheduleValue,
        expiresAt: expiresAt || undefined,
        notifyChannel: 'web_push',
        conditions: conditions.map((c) => ({ ...c })),
      });
      await loadTasks();
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleExecute = async (id: string) => {
    setExecLoadingId(id);
    try {
      await executeAgentTask(id);
      await loadTasks();
      if (selectedTaskId === id) {
        await loadEvents(id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setExecLoadingId(null);
    }
  };

  const subscribePush = async () => {
    if (!vapidKey) {
      setPushStatus('服务端未配置推送公钥，稍后重试或联系管理员');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('当前浏览器不支持推送');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('通知权限未授权');
        return;
      }

      const registration = await navigator.serviceWorker.register(inlineSwUrl || '/agent-sw.js', {
        scope: '/app/agent-tasks',
      });
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const payload = sub.toJSON();
      await savePushSubscription({
        endpoint: payload.endpoint || '',
        p256dh: payload.keys?.p256dh || '',
        auth: payload.keys?.auth || '',
        ua: navigator.userAgent,
      });
      setPushStatus('订阅成功');
      loadSubs();
    } catch (error) {
      console.error(error);
      setPushStatus('订阅失败');
    }
  };

  if (userLoading) return <PageLoading loading />;
  if (!user)
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h2 className="mb-3 text-xl font-semibold">请先登录以使用智能代理</h2>
        <p className="text-sm text-gray-500">登录后可创建条件提醒并接收推送</p>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 text-[var(--color-text)]">
      <section className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">1) 自然语言解析</h2>
          <button
            type="button"
            className="rounded bg-blue-500 px-4 py-2 text-white shadow hover:bg-blue-600 disabled:opacity-60"
            onClick={handleParse}
            disabled={parseLoading}
          >
            {parseLoading ? '解析中...' : '解析'}
          </button>
        </div>
        <textarea
          className="w-full rounded border border-slate-200 p-3 focus:border-blue-400 focus:outline-none"
          rows={3}
          value={nlText}
          onChange={(e) => setNlText(e.target.value)}
          placeholder="例如：如果明天北京下雨，早上8点提醒我"
        />
        {parseResult && (
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-slate-50 p-3 text-sm text-slate-700">
            {pretty(parseResult.parsed)}
          </pre>
        )}
      </section>

      <section className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">2) MCP 连接管理</h2>
          <button type="button" className="text-sm text-blue-600" onClick={loadConnections}>
            刷新
          </button>
        </div>
        {connError && <div className="mb-3 text-sm text-red-600">{connError}</div>}

        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <div className="mb-2 font-semibold">快速接入：粘贴 MCP JSON</div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              serverName（可选）
              <input
                className="rounded border border-slate-200 bg-white p-2"
                value={importServerName}
                onChange={(e) => setImportServerName(e.target.value)}
                placeholder="当配置包含 mcpServers 时可指定，例如 github"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              nameOverride（可选）
              <input
                className="rounded border border-slate-200 bg-white p-2"
                value={importNameOverride}
                onChange={(e) => setImportNameOverride(e.target.value)}
                placeholder="覆盖解析到的连接名"
              />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            MCP JSON（支持字段 serverUrl/url/endpoint，或 Claude Desktop 的 mcpServers 形态）
            <textarea
              className="min-h-[120px] w-full rounded border border-slate-200 bg-white p-2 font-mono text-xs"
              value={importConfigJson}
              onChange={(e) => setImportConfigJson(e.target.value)}
              placeholder='例如：{"name":"GitHub","serverUrl":"https://example.com/mcp","headers":{"Authorization":"Bearer xxx"}}'
            />
          </label>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              className="rounded bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
              onClick={doImportConn}
              disabled={importing}
            >
              {importing ? '导入中...' : '一键导入'}
            </button>
            <button
              type="button"
              className="rounded border border-slate-200 px-4 py-2 text-sm"
              onClick={resetImportForm}
            >
              清空
            </button>
            <div className="flex gap-2 ml-auto">
              <span className="text-xs text-slate-500 self-center">快速预设:</span>
              <button
                type="button"
                className="text-xs text-blue-600 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50"
                onClick={() => {
                  setImportConfigJson(
                    JSON.stringify(
                      {
                        name: 'LocalEcho',
                        command: 'node',
                        args: [
                          '-e',
                          "process.stdin.on('data', d => { const j=JSON.parse(d); if(j.method==='tools/call') console.log(JSON.stringify({jsonrpc:'2.0',id:j.id,result:{content:[{type:'text',text:'Hello from local node'}]}})) })",
                        ],
                        tools: [{ id: 'echo', name: 'Echo Tool' }],
                      },
                      null,
                      2,
                    ),
                  );
                }}
              >
                LocalEcho (Node)
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            连接名
            <input
              className="rounded border border-slate-200 p-2"
              value={connName}
              onChange={(e) => setConnName(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            serverUrl
            <input
              className="rounded border border-slate-200 p-2"
              value={connServerUrl}
              onChange={(e) => setConnServerUrl(e.target.value)}
              placeholder="https://example.com/mcp"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            状态
            <input
              className="rounded border border-slate-200 p-2"
              value={connStatus}
              onChange={(e) => setConnStatus(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            tools(JSON，可选)
            <textarea
              className="min-h-[110px] w-full rounded border border-slate-200 p-2 font-mono text-xs"
              value={connToolsText}
              onChange={(e) => setConnToolsText(e.target.value)}
              placeholder='例如：[{"id":"github.pr.list","name":"List PRs"}]'
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            credentials(JSON，可选)
            <textarea
              className="min-h-[110px] w-full rounded border border-slate-200 p-2 font-mono text-xs"
              value={connCredsText}
              onChange={(e) => setConnCredsText(e.target.value)}
              placeholder='例如：{"token":"***"}（注意不要在前端长期保存敏感信息）'
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            onClick={saveConn}
            disabled={connSaving}
          >
            {connSaving ? '保存中...' : connEditingId ? '保存修改' : '新增连接'}
          </button>
          <button type="button" className="rounded border border-slate-200 px-4 py-2 text-sm" onClick={resetConnForm}>
            重置
          </button>
          {connEditingId && <span className="text-xs text-slate-600">编辑中：{connEditingId}</span>}
        </div>

        <div className="mt-4 overflow-x-auto text-sm">
          <table className="min-w-full border border-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">名称</th>
                <th className="px-3 py-2 text-left">serverUrl</th>
                <th className="px-3 py-2 text-center">状态</th>
                <th className="px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {mcpConnections.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.serverUrl}</td>
                  <td className="px-3 py-2 text-center">{c.status || '-'}</td>
                  <td className="px-3 py-2 text-center">
                    <button type="button" className="mr-2 text-blue-600" onClick={() => startEditConn(c)}>
                      编辑
                    </button>
                    <button type="button" className="text-red-600" onClick={() => removeConn(c.id)}>
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {mcpConnections.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-slate-500" colSpan={4}>
                    暂无连接
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">3) 创建任务</h2>
          <button
            type="button"
            className="rounded bg-green-600 px-4 py-2 text-white shadow hover:bg-green-700 disabled:opacity-60"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? '提交中...' : '提交任务'}
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            标题
            <input
              className="rounded border border-slate-200 p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="北京天气提醒"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            过期时间 (ISO)
            <input
              className="rounded border border-slate-200 p-2"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              placeholder="2025-12-31T00:00:00+08:00"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            调度类型
            <select
              className="rounded border border-slate-200 p-2"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as 'fixed' | 'cron' | 'event')}
            >
              <option value="fixed">固定频率 (分钟)</option>
              <option value="cron">Cron 表达式</option>
              <option value="event">事件驱动</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {scheduleType === 'fixed' ? '频率 (分钟)' : '调度值'}
            <input
              className="rounded border border-slate-200 p-2"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
              placeholder={scheduleType === 'fixed' ? '5' : '0 0 8 * * *'}
            />
          </label>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">条件</h3>
            <button className="text-blue-600" type="button" onClick={addCondition}>
              + 新增条件
            </button>
          </div>
          {conditions.map((c, idx) => (
            <div key={idx} className="rounded border border-slate-200 p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>条件 #{idx + 1}</span>
                {conditions.length > 1 && (
                  <button type="button" className="text-red-500" onClick={() => removeCondition(idx)}>
                    删除
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm">
                  工具
                  <select
                    className="rounded border border-slate-200 p-2"
                    value={c.toolId || ''}
                    onChange={(e) => updateCondition(idx, { toolId: e.target.value })}
                  >
                    <option value="">选择 MCP 工具</option>
                    {toolOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  比较符
                  <select
                    className="rounded border border-slate-200 p-2"
                    value={c.comparator}
                    onChange={(e) =>
                      updateCondition(idx, {
                        comparator: e.target.value as AgentTaskCondition['comparator'],
                      })
                    }
                  >
                    <option value="contains">contains</option>
                    <option value="eq">eq</option>
                    <option value="gt">gt</option>
                    <option value="lt">lt</option>
                    <option value="regex">regex</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  阈值
                  <input
                    className="rounded border border-slate-200 p-2"
                    value={c.thresholdValue || ''}
                    onChange={(e) => updateCondition(idx, { thresholdValue: e.target.value })}
                    placeholder="如 rain 或 60000"
                  />
                </label>
              </div>
              <label className="mt-2 flex flex-col gap-1 text-sm">
                Join Logic (与下一个)
                <select
                  className="rounded border border-slate-200 p-2"
                  value={c.joinLogic || 'and'}
                  onChange={(e) =>
                    updateCondition(idx, {
                      joinLogic: e.target.value as AgentTaskCondition['joinLogic'],
                    })
                  }
                >
                  <option value="and">and</option>
                  <option value="or">or</option>
                </select>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">4) 任务列表</h2>
          <button type="button" className="text-sm text-blue-600" onClick={loadTasks} disabled={taskLoading}>
            刷新
          </button>
        </div>
        {taskLoading ? (
          <PageLoading loading />
        ) : (
          <div className="overflow-x-auto text-sm">
            <table className="min-w-full border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left">标题</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">下次执行</th>
                  <th className="px-3 py-2">触发次数</th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {taskList.map((task) => (
                  <tr key={task.id} className="border-t">
                    <td className="px-3 py-2">{task.title}</td>
                    <td className="px-3 py-2 text-center">{task.status}</td>
                    <td className="px-3 py-2 text-center">{task.nextRunAt || '-'}</td>
                    <td className="px-3 py-2 text-center">{task.triggerCount ?? 0}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="mr-2 text-sm text-slate-700 underline"
                        onClick={() => loadEvents(task.id)}
                      >
                        事件
                      </button>
                      <button
                        type="button"
                        className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 disabled:opacity-60"
                        onClick={() => handleExecute(task.id)}
                        disabled={execLoadingId === task.id}
                      >
                        {execLoadingId === task.id ? '执行中' : '立即执行'}
                      </button>
                    </td>
                  </tr>
                ))}
                {taskList.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-center text-slate-500" colSpan={5}>
                      暂无任务
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">5) Web Push 订阅</h2>
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-2 text-white shadow hover:bg-indigo-700"
            onClick={subscribePush}
          >
            一键订阅
          </button>
        </div>
        <p className="text-sm text-slate-600">需要在浏览器授权通知，iOS 需添加到主屏幕后再订阅。</p>
        {pushStatus && <p className="mt-2 text-sm text-amber-700">{pushStatus}</p>}
        {subs.length > 0 && (
          <div className="mt-3 text-sm text-slate-700">
            <div className="font-semibold">已保存订阅：</div>
            <ul className="list-disc pl-5">
              {subs.map((s, idx) => (
                <li key={idx} className="break-all text-xs">
                  {s.endpoint}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">6) 任务事件审计</h2>
          {selectedTaskId && (
            <button type="button" className="text-sm text-blue-600" onClick={() => loadEvents(selectedTaskId)}>
              刷新
            </button>
          )}
        </div>
        {!selectedTaskId ? (
          <div className="text-sm text-slate-600">在“任务列表”里点「事件」查看执行记录。</div>
        ) : eventsLoading ? (
          <PageLoading loading />
        ) : (
          <div>
            {eventsError && <div className="mb-2 text-sm text-red-600">{eventsError}</div>}
            <div className="mb-2 text-xs text-slate-600">taskId: {selectedTaskId}</div>
            <pre className="max-h-64 overflow-auto rounded bg-slate-50 p-3 text-xs text-slate-700">
              {pretty(taskEvents)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};

export default AgentTaskPage;
