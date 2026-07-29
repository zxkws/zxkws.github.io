import { message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  type ResearchCapabilities,
  type ResearchDepth,
  type ResearchDiscoveryProvider,
  type ResearchInputSource,
  type ResearchTask,
  type ResearchTaskDetail,
  researchService,
} from '../../services/researchService';
import './research-workspace.css';

type ResearchWorkspaceProps = {
  question: string;
  instructions: string;
  knowledgeBaseIds: string[];
  channelId?: number;
  model?: string;
};

type SourceDraft = {
  id: string;
  kind: 'url' | 'manual';
  title: string;
  value: string;
  author: string;
  publishedAt: string;
};

const newSource = (kind: SourceDraft['kind']): SourceDraft => ({
  id:
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  kind,
  title: '',
  value: '',
  author: '',
  publishedAt: '',
});

const activeStatuses: ResearchTask['status'][] = ['queued', 'planning', 'collecting', 'researching', 'reviewing'];
const researchStatuses: ResearchTask['status'][] = ['draft', ...activeStatuses, 'completed', 'failed', 'cancelled'];

const latestEventId = (events: ResearchTaskDetail['events']) =>
  events.reduce((latest, event) => (event.id === undefined ? latest : Math.max(latest, event.id)), 0);

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const waitForReconnect = (signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    let timer = 0;
    const cancel = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    timer = window.setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, 1000);
    signal.addEventListener('abort', cancel, { once: true });
  });

const errorStatus = (error: unknown) =>
  error && typeof error === 'object' && typeof (error as { status?: unknown }).status === 'number'
    ? (error as { status: number }).status
    : null;

const toInputSource = (source: SourceDraft): ResearchInputSource => ({
  kind: source.kind,
  title: source.title.trim() || undefined,
  ...(source.kind === 'url' ? { url: source.value.trim() } : { content: source.value }),
  author: source.author.trim() || undefined,
  publishedAt: source.publishedAt.trim() || undefined,
});

export default function ResearchWorkspace({
  question,
  instructions,
  knowledgeBaseIds,
  channelId,
  model,
}: ResearchWorkspaceProps) {
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [detail, setDetail] = useState<ResearchTaskDetail | null>(null);
  const [capabilities, setCapabilities] = useState<ResearchCapabilities | null>(null);
  const [capabilityAvailable, setCapabilityAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('zh-CN');
  const [depth, setDepth] = useState<ResearchDepth>('deep');
  const [maxSections, setMaxSections] = useState('7');
  const [maxSources, setMaxSources] = useState('24');
  const [requirePlanApproval, setRequirePlanApproval] = useState(true);
  const [discoveryProviders, setDiscoveryProviders] = useState<ResearchDiscoveryProvider[]>([
    'searxng',
    'wikipedia',
    'openalex',
  ]);
  const [sourceDrafts, setSourceDrafts] = useState<SourceDraft[]>([]);
  const [planEditor, setPlanEditor] = useState('');
  const streamController = useRef<AbortController | null>(null);
  const operationRef = useRef<{ taskId: string; kind: 'plan' | 'execute' } | null>(null);
  const selectedTaskIdRef = useRef<string | null>(null);
  const taskSelectionRequestRef = useRef(0);

  const notifyTrackedOperation = (task: ResearchTask) => {
    const operation = operationRef.current;
    if (!operation || operation.taskId !== task.id || activeStatuses.includes(task.status)) return;
    operationRef.current = null;
    if (task.status === 'failed') {
      message.error(task.error || '研究任务执行失败');
    } else if (task.status === 'cancelled') {
      message.info('研究任务已取消');
    } else if (operation.kind === 'plan' && task.status === 'draft') {
      message.success('研究计划已生成');
    } else if (operation.kind === 'execute' && task.status === 'completed') {
      message.success('深度研究已完成');
    }
  };

  const selectTask = async (task: ResearchTask) => {
    const requestId = taskSelectionRequestRef.current + 1;
    taskSelectionRequestRef.current = requestId;
    const selectionChanged = selectedTaskIdRef.current !== task.id;
    selectedTaskIdRef.current = task.id;
    if (selectionChanged) {
      setDetail(null);
      setPlanEditor('');
    }
    try {
      const selected = await researchService.get(task.id);
      if (taskSelectionRequestRef.current !== requestId || selectedTaskIdRef.current !== task.id) return;
      setDetail(selected);
      setPlanEditor(selected.task.plan ? JSON.stringify(selected.task.plan, null, 2) : '');
    } catch (error) {
      if (taskSelectionRequestRef.current !== requestId || selectedTaskIdRef.current !== task.id) return;
      message.error(error instanceof Error ? error.message : '研究任务详情加载失败');
    }
  };

  const load = async (preferredId?: string) => {
    setLoading(true);
    try {
      const rows = await researchService.list();
      let capabilityResult: ResearchCapabilities | null = null;
      try {
        capabilityResult = await researchService.capabilities();
      } catch (error) {
        if (errorStatus(error) !== 404) {
          message.error(error instanceof Error ? error.message : '研究能力信息加载失败');
        }
      }
      setCapabilityAvailable(true);
      setTasks(rows);
      setCapabilities(capabilityResult);
      const selected = rows.find((item) => item.id === (preferredId || detail?.task.id)) || rows[0];
      if (selected) await selectTask(selected);
      else {
        selectedTaskIdRef.current = null;
        setDetail(null);
        setPlanEditor('');
      }
    } catch (error) {
      if (errorStatus(error) === 404) {
        setCapabilityAvailable(false);
        return;
      }
      message.error(error instanceof Error ? error.message : '研究任务加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    return () => streamController.current?.abort();
  }, []);

  useEffect(() => {
    const task = detail?.task;
    if (!task || !activeStatuses.includes(task.status)) return;
    let stopped = false;
    let requestInFlight = false;
    const poll = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const result = await researchService.get(task.id).catch(() => null);
        if (!stopped && result) {
          setDetail((current) => (current?.task.id === task.id ? result : current));
          setTasks((current) => current.map((item) => (item.id === result.task.id ? result.task : item)));
          if (result.task.status === 'draft' && result.task.plan && selectedTaskIdRef.current === result.task.id) {
            setPlanEditor(JSON.stringify(result.task.plan, null, 2));
          }
          notifyTrackedOperation(result.task);
        }
      } finally {
        requestInFlight = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2_500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [detail?.task.id, detail?.task.status]);

  const updateSource = (id: string, patch: Partial<SourceDraft>) => {
    setSourceDrafts((current) => current.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  };

  const createTask = async () => {
    if (!question.trim()) {
      message.warning('请先填写上方的任务目标');
      return;
    }
    if (Boolean(channelId) !== Boolean(model?.trim())) {
      message.warning('channelId 与 model 必须同时填写');
      return;
    }
    const invalidSource = sourceDrafts.find((source) => !source.value.trim());
    if (invalidSource) {
      message.warning('研究来源内容或 URL 不能为空');
      return;
    }
    setLoading(true);
    try {
      const created = await researchService.create({
        title: title.trim() || undefined,
        question: question.trim(),
        instructions: instructions.trim() || undefined,
        language: language.trim(),
        depth,
        channelId,
        model: model?.trim() || undefined,
        discoveryProviders,
        knowledgeBaseIds,
        maxSections: Number(maxSections),
        maxSources: Number(maxSources),
        requirePlanApproval,
        sources: sourceDrafts.map(toInputSource),
      });
      selectedTaskIdRef.current = created.task.id;
      setDetail(created);
      setPlanEditor(created.task.plan ? JSON.stringify(created.task.plan, null, 2) : '');
      setTasks((current) => [created.task, ...current.filter((item) => item.id !== created.task.id)]);
      setSourceDrafts([]);
      message.success('研究任务已创建');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '研究任务创建失败');
    } finally {
      setLoading(false);
    }
  };

  const appendSources = async () => {
    if (!detail || !sourceDrafts.length) return;
    const taskId = detail.task.id;
    const invalidSource = sourceDrafts.find((source) => !source.value.trim());
    if (invalidSource) {
      message.warning('研究来源内容或 URL 不能为空');
      return;
    }
    try {
      const result = await researchService.addSources(taskId, sourceDrafts.map(toInputSource));
      setDetail((current) => (current?.task.id === taskId ? result : current));
      setSourceDrafts([]);
      message.success('研究来源已追加');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '研究来源追加失败');
    }
  };

  const removeSource = async (sourceId: string) => {
    if (!detail || !window.confirm('确认删除这个研究来源？已生成的章节和报告将失效。')) return;
    const taskId = detail.task.id;
    try {
      await researchService.removeSource(taskId, sourceId);
      const result = await researchService.get(taskId);
      setDetail((current) => (current?.task.id === taskId ? result : current));
      message.success('研究来源已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '研究来源删除失败');
    }
  };

  const createPlan = async () => {
    if (!detail) return;
    const taskId = detail.task.id;
    operationRef.current = { taskId, kind: 'plan' };
    setRunning(true);
    try {
      const result = await researchService.plan(taskId);
      setDetail((current) => (current?.task.id === taskId ? result : current));
      if (!activeStatuses.includes(result.task.status) && selectedTaskIdRef.current === taskId) {
        setPlanEditor(result.task.plan ? JSON.stringify(result.task.plan, null, 2) : '');
      }
      setTasks((current) => current.map((task) => (task.id === result.task.id ? result.task : task)));
      if (activeStatuses.includes(result.task.status)) {
        message.info('研究计划已加入后台队列，页面将自动刷新');
      } else {
        notifyTrackedOperation(result.task);
      }
    } catch (error) {
      operationRef.current = null;
      message.error(error instanceof Error ? error.message : '研究计划生成失败');
    } finally {
      setRunning(false);
    }
  };

  const savePlan = async () => {
    if (!detail) return;
    const taskId = detail.task.id;
    try {
      const plan = JSON.parse(planEditor) as unknown;
      if (!plan || Array.isArray(plan) || typeof plan !== 'object') {
        throw new Error('研究计划必须是 JSON 对象');
      }
      const result = await researchService.updatePlan(taskId, plan as NonNullable<ResearchTask['plan']>);
      setDetail((current) => (current?.task.id === taskId ? result : current));
      if (selectedTaskIdRef.current === taskId) {
        setPlanEditor(result.task.plan ? JSON.stringify(result.task.plan, null, 2) : '');
      }
      message.success('研究计划已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '研究计划保存失败');
    }
  };

  const approvePlan = async () => {
    if (!detail) return;
    const taskId = detail.task.id;
    try {
      const result = await researchService.approvePlan(taskId);
      setDetail((current) => (current?.task.id === taskId ? result : current));
      message.success('研究计划已批准');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '研究计划批准失败');
    }
  };

  const execute = async () => {
    if (!detail) return;
    const taskId = detail.task.id;
    operationRef.current = { taskId, kind: 'execute' };
    setRunning(true);
    const controller = new AbortController();
    streamController.current = controller;
    let current = detail;
    let cursor = latestEventId(detail.events);
    let streamFailures = 0;
    try {
      current = await researchService.queueExecution(taskId);
      cursor = latestEventId(current.events);
      setDetail((existing) => (existing?.task.id === taskId ? current : existing));
      setTasks((tasks) => tasks.map((task) => (task.id === current.task.id ? current.task : task)));
      message.info('研究任务已加入后台队列，页面将持续刷新进度');

      while (activeStatuses.includes(current.task.status) && !controller.signal.aborted) {
        try {
          const checkpoint = await researchService.streamEvents(
            taskId,
            cursor,
            (event) => {
              if (event.id !== undefined) cursor = Math.max(cursor, event.id);
              const eventStatus = researchStatuses.includes(event.stage as ResearchTask['status'])
                ? (event.stage as ResearchTask['status'])
                : undefined;
              setDetail((existing) => {
                if (!existing || existing.task.id !== taskId) return existing;
                const events =
                  event.id === undefined
                    ? [...existing.events, event]
                    : [...existing.events.filter((item) => item.id !== event.id), event];
                return {
                  ...existing,
                  task: {
                    ...existing.task,
                    progress: event.progress,
                    status: eventStatus || existing.task.status,
                  },
                  events: events.slice(-500),
                };
              });
              setTasks((tasks) =>
                tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        progress: event.progress,
                        status: eventStatus || task.status,
                      }
                    : task,
                ),
              );
            },
            controller.signal,
          );
          cursor = Math.max(cursor, checkpoint.after);
          streamFailures = 0;
        } catch (error) {
          if (isAbortError(error)) throw error;
          streamFailures += 1;
        }

        const refreshed = await researchService.get(taskId);
        current = refreshed;
        cursor = Math.max(cursor, latestEventId(refreshed.events));
        setDetail((existing) => (existing?.task.id === taskId ? refreshed : existing));
        setTasks((tasks) => tasks.map((task) => (task.id === refreshed.task.id ? refreshed.task : task)));
        if (!activeStatuses.includes(refreshed.task.status)) break;
        if (streamFailures >= 3) {
          message.warning('实时事件连接暂时不可用，已切换为轮询更新');
          break;
        }
        await waitForReconnect(controller.signal);
      }

      const result = await researchService.get(taskId);
      setDetail((existing) => (existing?.task.id === taskId ? result : existing));
      if (selectedTaskIdRef.current === taskId) {
        setPlanEditor(result.task.plan ? JSON.stringify(result.task.plan, null, 2) : '');
      }
      setTasks((tasks) => tasks.map((task) => (task.id === result.task.id ? result.task : task)));
      if (activeStatuses.includes(result.task.status)) {
        message.info('研究任务仍在后台执行，页面将继续轮询进度');
      } else {
        notifyTrackedOperation(result.task);
      }
    } catch (error) {
      if (!isAbortError(error)) {
        operationRef.current = null;
        message.error(error instanceof Error ? error.message : '深度研究执行失败');
      }
      const result = await researchService.get(taskId).catch(() => null);
      if (result) {
        setDetail((existing) => (existing?.task.id === taskId ? result : existing));
        setTasks((tasks) => tasks.map((task) => (task.id === result.task.id ? result.task : task)));
        if (!activeStatuses.includes(result.task.status)) notifyTrackedOperation(result.task);
      }
    } finally {
      streamController.current = null;
      setRunning(false);
    }
  };

  const cancel = async () => {
    if (!detail) return;
    const taskId = detail.task.id;
    try {
      const result = await researchService.cancel(taskId);
      streamController.current?.abort();
      setDetail((current) => (current?.task.id === taskId ? { ...current, task: result } : current));
      setTasks((current) => current.map((task) => (task.id === result.id ? result : task)));
      if (!activeStatuses.includes(result.status)) operationRef.current = null;
      message.info('已请求取消研究任务');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '研究任务取消失败');
    }
  };

  const removeTask = async () => {
    if (!detail || !window.confirm(`确认删除研究任务“${detail.task.title}”？`)) return;
    try {
      await researchService.remove(detail.task.id);
      selectedTaskIdRef.current = null;
      setDetail(null);
      await load();
      message.success('研究任务已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '研究任务删除失败');
    }
  };

  if (!capabilityAvailable) {
    return (
      <section className="workspace-panel research-workspace">
        <h2>深度研究</h2>
        <p className="workspace-panel__meta">当前后端尚未开放 Research API，仍可使用上方 aime 任务执行。</p>
        <button type="button" className="workspace-button" onClick={() => void load()}>
          重新探测
        </button>
      </section>
    );
  }

  return (
    <section className="workspace-panel research-workspace">
      <div className="workspace-panel__header">
        <div>
          <h2>深度研究</h2>
          <p className="workspace-panel__meta">多阶段规划、来源收集、分章节研究、审校与六种服务端格式导出。</p>
          {capabilities ? (
            <p className="workspace-panel__meta">
              builtInSearxngUrl: {capabilities.builtInSearxngUrl} · artifactFormats:{' '}
              {JSON.stringify(capabilities.artifactFormats)}
            </p>
          ) : null}
        </div>
        <button type="button" className="workspace-button" disabled={loading} onClick={() => void load()}>
          刷新
        </button>
      </div>

      <div className="research-create">
        <div className="research-create__grid">
          <label className="workspace-field">
            报告标题（可选）
            <input className="workspace-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="workspace-field">
            language
            <input
              className="workspace-input workspace-input--mono"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
          </label>
          <label className="workspace-field">
            depth
            <select
              className="workspace-input"
              value={depth}
              onChange={(event) => setDepth(event.target.value as ResearchDepth)}
            >
              <option value="quick">quick</option>
              <option value="standard">standard</option>
              <option value="deep">deep</option>
            </select>
          </label>
          <label className="workspace-field">
            maxSections
            <input
              className="workspace-input"
              type="number"
              min="2"
              max={capabilities?.limits.maxSections || 10}
              value={maxSections}
              onChange={(event) => setMaxSections(event.target.value)}
            />
          </label>
          <label className="workspace-field">
            maxSources
            <input
              className="workspace-input"
              type="number"
              min="1"
              max={capabilities?.limits.maxSources || 40}
              value={maxSources}
              onChange={(event) => setMaxSources(event.target.value)}
            />
          </label>
        </div>
        <div className="workspace-inline-actions research-create__checks">
          {(capabilities?.discoveryProviders || ['searxng', 'wikipedia', 'openalex']).map((provider) => (
            <label className="rbac-check" key={provider}>
              <input
                type="checkbox"
                checked={discoveryProviders.includes(provider)}
                onChange={() =>
                  setDiscoveryProviders((current) =>
                    current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider],
                  )
                }
              />
              {provider}
            </label>
          ))}
          <label className="rbac-check">
            <input
              type="checkbox"
              checked={requirePlanApproval}
              onChange={(event) => setRequirePlanApproval(event.target.checked)}
            />
            requirePlanApproval
          </label>
        </div>
        <div className="workspace-inline-actions">
          <button
            type="button"
            className="workspace-button"
            onClick={() => setSourceDrafts((current) => [...current, newSource('url')])}
          >
            添加 URL 来源
          </button>
          <button
            type="button"
            className="workspace-button"
            onClick={() => setSourceDrafts((current) => [...current, newSource('manual')])}
          >
            添加手动来源
          </button>
        </div>
        {sourceDrafts.map((source) => (
          <article className="research-source-draft" key={source.id}>
            <div className="research-source-draft__meta">
              <label className="workspace-field">
                kind
                <select
                  className="workspace-input"
                  value={source.kind}
                  onChange={(event) => updateSource(source.id, { kind: event.target.value as SourceDraft['kind'] })}
                >
                  <option value="url">url</option>
                  <option value="manual">manual</option>
                </select>
              </label>
              <label className="workspace-field">
                title
                <input
                  className="workspace-input"
                  value={source.title}
                  onChange={(event) => updateSource(source.id, { title: event.target.value })}
                />
              </label>
              <label className="workspace-field">
                author
                <input
                  className="workspace-input"
                  value={source.author}
                  onChange={(event) => updateSource(source.id, { author: event.target.value })}
                />
              </label>
              <label className="workspace-field">
                publishedAt
                <input
                  className="workspace-input"
                  value={source.publishedAt}
                  onChange={(event) => updateSource(source.id, { publishedAt: event.target.value })}
                />
              </label>
            </div>
            <div className="workspace-field">
              <label htmlFor={`research-source-${source.id}`}>{source.kind === 'url' ? 'HTTPS URL' : 'content'}</label>
              {source.kind === 'url' ? (
                <input
                  id={`research-source-${source.id}`}
                  className="workspace-input workspace-input--mono"
                  type="url"
                  value={source.value}
                  onChange={(event) => updateSource(source.id, { value: event.target.value })}
                />
              ) : (
                <textarea
                  id={`research-source-${source.id}`}
                  className="workspace-textarea"
                  value={source.value}
                  onChange={(event) => updateSource(source.id, { value: event.target.value })}
                />
              )}
            </div>
            <button
              type="button"
              className="workspace-button workspace-button--danger"
              onClick={() => setSourceDrafts((current) => current.filter((item) => item.id !== source.id))}
            >
              删除来源
            </button>
          </article>
        ))}
        <button
          type="button"
          className="workspace-button workspace-button--primary"
          disabled={loading || !question.trim()}
          onClick={() => void createTask()}
        >
          创建研究任务
        </button>
        {detail && sourceDrafts.length ? (
          <button type="button" className="workspace-button" onClick={() => void appendSources()}>
            将以上来源追加到当前任务
          </button>
        ) : null}
      </div>

      <div className="research-shell">
        <aside className="research-task-list">
          {tasks.map((task) => (
            <button
              type="button"
              key={task.id}
              data-active={task.id === detail?.task.id}
              onClick={() => void selectTask(task)}
            >
              <strong>{task.title}</strong>
              <span>status: {task.status}</span>
              <span>progress: {task.progress}</span>
              <span>createdAt: {task.createdAt}</span>
            </button>
          ))}
        </aside>
        <div className="research-detail">
          {detail ? (
            <>
              <div className="workspace-panel__header">
                <div>
                  <h3>{detail.task.title}</h3>
                  <p className="workspace-panel__meta">
                    status: {detail.task.status} · progress: {detail.task.progress} · revision: {detail.task.revision}
                  </p>
                  <p className="workspace-panel__meta">
                    jobKind: {detail.task.jobKind} · attempt: {detail.task.attempt}/{detail.task.maxAttempts} ·
                    queuedAt: {detail.task.queuedAt} · nextRunAt: {detail.task.nextRunAt}
                  </p>
                  <p className="workspace-panel__meta">
                    leaseOwner: {detail.task.leaseOwner} · leaseExpiresAt: {detail.task.leaseExpiresAt} · heartbeatAt:{' '}
                    {detail.task.heartbeatAt}
                  </p>
                </div>
                <div className="workspace-inline-actions research-task-actions">
                  <span className="research-action-slot">
                    {!activeStatuses.includes(detail.task.status) ? (
                      <button
                        type="button"
                        className="workspace-button"
                        disabled={running}
                        onClick={() => void createPlan()}
                      >
                        生成计划
                      </button>
                    ) : null}
                  </span>
                  <span className="research-action-slot">
                    {detail.task.plan &&
                    !activeStatuses.includes(detail.task.status) &&
                    (!detail.task.requirePlanApproval || detail.task.planApprovedAt) ? (
                      <button
                        type="button"
                        className="workspace-button workspace-button--primary"
                        disabled={running}
                        onClick={() => void execute()}
                      >
                        {running ? '正在排队…' : '执行研究'}
                      </button>
                    ) : null}
                  </span>
                  <span className="research-action-slot">
                    {activeStatuses.includes(detail.task.status) ? (
                      <button
                        type="button"
                        className="workspace-button workspace-button--danger"
                        onClick={() => void cancel()}
                      >
                        取消
                      </button>
                    ) : null}
                  </span>
                  <span className="research-action-slot">
                    {!activeStatuses.includes(detail.task.status) ? (
                      <button
                        type="button"
                        className="workspace-button workspace-button--danger"
                        disabled={running}
                        onClick={() => void removeTask()}
                      >
                        删除任务
                      </button>
                    ) : null}
                  </span>
                </div>
              </div>
              <div
                className="agent-progress__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={detail.task.progress}
              >
                <span style={{ width: `${detail.task.progress}%` }} />
              </div>
              <pre className="research-question">{detail.task.question}</pre>
              {detail.task.plan ? (
                <details open className="research-plan">
                  <summary>研究计划</summary>
                  <textarea
                    className="workspace-textarea workspace-input--mono"
                    value={planEditor}
                    disabled={activeStatuses.includes(detail.task.status)}
                    onChange={(event) => setPlanEditor(event.target.value)}
                  />
                  <div className="workspace-inline-actions">
                    <button
                      type="button"
                      className="workspace-button"
                      disabled={activeStatuses.includes(detail.task.status)}
                      onClick={() => void savePlan()}
                    >
                      保存计划
                    </button>
                    {detail.task.requirePlanApproval && !detail.task.planApprovedAt ? (
                      <button
                        type="button"
                        className="workspace-button workspace-button--primary"
                        disabled={activeStatuses.includes(detail.task.status)}
                        onClick={() => void approvePlan()}
                      >
                        批准计划
                      </button>
                    ) : null}
                  </div>
                </details>
              ) : null}
              <div className="research-section-list">
                {detail.sections.map((section) => (
                  <article key={section.id}>
                    <strong>{section.title}</strong>
                    <span>
                      status: {section.status} · characterCount: {section.characterCount}
                    </span>
                    <p>{section.objective}</p>
                    {section.content ? <pre>{section.content}</pre> : null}
                    <span>citationKeys: {JSON.stringify(section.citationKeys)}</span>
                    <span>reviewIssues: {JSON.stringify(section.reviewIssues)}</span>
                    {section.error ? <span>error: {section.error}</span> : null}
                  </article>
                ))}
              </div>
              {detail.task.reportMarkdown ? <pre className="research-report">{detail.task.reportMarkdown}</pre> : null}
              <div className="research-artifacts">
                {detail.artifacts.map((artifact) => (
                  <button
                    type="button"
                    className="workspace-button"
                    key={artifact.id}
                    onClick={() =>
                      void researchService
                        .downloadArtifact(detail.task.id, artifact)
                        .catch((error: unknown) =>
                          message.error(error instanceof Error ? error.message : '研究报告下载失败'),
                        )
                    }
                  >
                    {artifact.format} · {artifact.fileName}
                  </button>
                ))}
              </div>
              <details className="research-data">
                <summary>来源 · {detail.sources.length}</summary>
                <div className="research-source-list">
                  {detail.sources.map((source) => (
                    <article key={source.id}>
                      <strong>
                        {source.citationKey} · {source.title}
                      </strong>
                      <span>
                        kind: {source.kind} · status: {source.status}
                      </span>
                      {source.url ? (
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.url}
                        </a>
                      ) : null}
                      <span>author: {source.author}</span>
                      <span>publishedAt: {source.publishedAt}</span>
                      <span>excerpt: {source.excerpt}</span>
                      {source.error ? <span>error: {source.error}</span> : null}
                      {!activeStatuses.includes(detail.task.status) ? (
                        <button
                          type="button"
                          className="workspace-button workspace-button--danger"
                          onClick={() => void removeSource(source.id)}
                        >
                          删除来源
                        </button>
                      ) : null}
                    </article>
                  ))}
                </div>
              </details>
              <details className="research-data">
                <summary>事件 · {detail.events.length}</summary>
                <div className="studio-event-list">
                  {detail.events.map((event, index) => (
                    <article key={event.id ?? `${event.type}-${index}`} data-level={event.level}>
                      <strong>{event.type}</strong>
                      <span>
                        stage: {event.stage} · progress: {event.progress}
                      </span>
                      <span>{event.createdAt}</span>
                      {event.message ? <p>{event.message}</p> : null}
                      {event.data ? <pre>{JSON.stringify(event.data, null, 2)}</pre> : null}
                    </article>
                  ))}
                </div>
              </details>
            </>
          ) : (
            <p className="studio-empty">创建或选择一个研究任务。</p>
          )}
        </div>
      </div>
    </section>
  );
}
