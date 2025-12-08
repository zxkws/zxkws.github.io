import { useEffect, useMemo, useState } from 'react';
import PageLoading from '../../components/PageLoading';
import { useUser } from '../../context/UserContext';
import {
  type AgentTask,
  type AgentTaskCondition,
  createAgentTask,
  executeAgentTask,
  listAgentTasks,
  listMcpConnections,
  listPushSubscriptions,
  type McpConnection,
  type PushSubscriptionPayload,
  parseTaskByNl,
  savePushSubscription,
} from '../../services/agentTaskService';

// TODO: 将此处替换为你的 VAPID 公钥（仅公钥，私钥留在服务端）
const vapidPublicKey = 'REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY';

const defaultCondition: AgentTaskCondition = {
  sourceType: 'mcp',
  comparator: 'contains',
  joinLogic: 'and',
};

const pretty = (obj: unknown) => JSON.stringify(obj, null, 2);

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
  const [subs, setSubs] = useState<PushSubscriptionPayload[]>([]);
  const [pushStatus, setPushStatus] = useState<string>('');

  const toolOptions = useMemo(() => {
    const list: Array<{ id: string; label: string }> = [];
    mcpConnections.forEach((conn) => {
      conn.tools?.forEach((tool) => {
        const id = tool.id || tool.name || '';
        if (id) {
          list.push({
            id,
            label: `${conn.name}: ${tool.name || tool.id || ''}`,
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

  const loadSubs = async () => {
    try {
      const data = await listPushSubscriptions();
      setSubs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      loadTasks();
      loadConnections();
      loadSubs();
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
    } catch (error) {
      console.error(error);
    } finally {
      setExecLoadingId(null);
    }
  };

  const subscribePush = async () => {
    if (!vapidPublicKey) {
      setPushStatus('缺少 VAPID 公钥（VITE_VAPID_PUBLIC_KEY）');
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

      const registration = await navigator.serviceWorker.register('/sw.js');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
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
    <div className="flex flex-1 flex-col gap-6 p-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">2) 创建任务</h2>
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">3) 任务列表</h2>
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

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">4) Web Push 订阅</h2>
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
    </div>
  );
};

export default AgentTaskPage;
