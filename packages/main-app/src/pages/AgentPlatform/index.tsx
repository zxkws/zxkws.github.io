import { message } from 'antd';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  type AgentEvaluation,
  type AgentMcpServer,
  type AgentRun,
  type AgentRunEvent,
  type AgentSkill,
  type AgentTask,
  agentPlatformService,
  type McpTestResult,
} from '../../services/agentPlatformService';
import '../rbac-admin.css';
import '../studio.css';
import './agent-open-ecosystem.css';
import './agent-task.css';

const emptySkill = {
  name: '',
  code: '',
  description: '',
  instructions: '',
  enabled: true,
};

const emptyMcp = {
  name: '',
  code: '',
  description: '',
  transport: 'streamable-http' as AgentMcpServer['transport'],
  endpoint: '',
  command: '',
  args: '[]',
  allowedTools: '',
  approvalRequiredTools: '',
  headers: '{}',
  env: '{}',
  enabled: true,
};

const emptySkillImport = {
  sourceType: 'content' as 'content' | 'url' | 'github',
  content: '',
  url: '',
  ref: '',
  path: '',
};

const csv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

export default function AgentPlatform() {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [servers, setServers] = useState<AgentMcpServer[]>([]);
  const [workspaceGuides, setWorkspaceGuides] = useState<Record<string, unknown> | null>(null);
  const [workspaces, setWorkspaces] = useState<
    Array<{
      provider: 'elderberry-ssh';
      name: string;
      target: string;
      defaultDirectory: string;
      allowedRoots: string[];
      capability: Record<string, unknown>;
    }>
  >([]);
  const [workspaceProvider, setWorkspaceProvider] = useState<'' | 'elderberry-ssh'>('');
  const [workspaceDirectory, setWorkspaceDirectory] = useState('/root/agent-workspaces');
  const [workspaceProbe, setWorkspaceProbe] = useState<Record<string, unknown> | null>(null);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [skillDraft, setSkillDraft] = useState(emptySkill);
  const [skillImportDraft, setSkillImportDraft] = useState(emptySkillImport);
  const [mcpDraft, setMcpDraft] = useState(emptyMcp);
  const [mcpImportSource, setMcpImportSource] = useState('generic');
  const [mcpImportJson, setMcpImportJson] = useState('');
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingMcpId, setEditingMcpId] = useState<string | null>(null);
  const [mcpTest, setMcpTest] = useState<McpTestResult | null>(null);
  const [prompt, setPrompt] = useState('');
  const [taskContext, setTaskContext] = useState('');
  const [taskMaterial, setTaskMaterial] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([]);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
  const [activeTask, setActiveTask] = useState<AgentTask | null>(null);
  const [taskInputDrafts, setTaskInputDrafts] = useState<Record<string, string>>({});
  const [runEvents, setRunEvents] = useState<AgentRunEvent[]>([]);
  const [evaluations, setEvaluations] = useState<AgentEvaluation[]>([]);
  const [evaluationDraft, setEvaluationDraft] = useState({
    label: '',
    expectedContains: '',
    forbiddenContains: '',
    minimumCitationCount: '',
    maximumDurationMs: '',
  });
  const [liveOutput, setLiveOutput] = useState('');
  const [threadId, setThreadId] = useState('');
  const [runningRunId, setRunningRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [importingSkill, setImportingSkill] = useState(false);
  const [refreshingSkillId, setRefreshingSkillId] = useState<string | null>(null);
  const [importingMcp, setImportingMcp] = useState(false);
  const streamController = useRef<AbortController | null>(null);

  const selectRun = async (run: AgentRun) => {
    setActiveRun(run);
    setLiveOutput('');
    try {
      const [details, events, evaluationRows, task] = await Promise.all([
        agentPlatformService.getRun(run.id),
        agentPlatformService.listRunEvents(run.id),
        agentPlatformService.listEvaluations(run.id),
        agentPlatformService.getTask(run.id).catch(() => null),
      ]);
      setActiveRun(details);
      setActiveTask(task);
      setRunEvents(events);
      setEvaluations(evaluationRows);
      setThreadId(details.threadId);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '运行详情加载失败');
    }
  };

  const load = async (preferredRunId?: string) => {
    setLoading(true);
    try {
      const [skillRows, serverRows, runRows, guide, workspaceRows] = await Promise.all([
        agentPlatformService.listSkills(),
        agentPlatformService.listMcpServers(),
        agentPlatformService.listRuns(),
        agentPlatformService.workspaceGuides(),
        agentPlatformService.listWorkspaces(),
      ]);
      setSkills(skillRows);
      setServers(serverRows);
      setRuns(runRows);
      setWorkspaceGuides(guide);
      setWorkspaces(workspaceRows);
      const selected = runRows.find((row) => row.id === (preferredRunId || activeRun?.id)) || runRows[0] || null;
      setActiveRun(selected);
      if (selected) {
        const [details, events, evaluationRows, task] = await Promise.all([
          agentPlatformService.getRun(selected.id),
          agentPlatformService.listRunEvents(selected.id),
          agentPlatformService.listEvaluations(selected.id),
          agentPlatformService.getTask(selected.id).catch(() => null),
        ]);
        setActiveRun(details);
        setActiveTask(task);
        setRunEvents(events);
        setEvaluations(evaluationRows);
      } else {
        setActiveTask(null);
        setRunEvents([]);
        setEvaluations([]);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Agent 平台加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Agent 平台 · 光域';
    void load();
    return () => streamController.current?.abort();
  }, []);

  const saveSkill = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editingSkillId) await agentPlatformService.updateSkill(editingSkillId, skillDraft);
      else await agentPlatformService.createSkill(skillDraft);
      setEditingSkillId(null);
      setSkillDraft(emptySkill);
      await load();
      message.success('Skill 已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Skill 保存失败');
    }
  };

  const editSkill = (skill: AgentSkill) => {
    setEditingSkillId(skill.id);
    setSkillDraft({
      name: skill.name,
      code: skill.code,
      description: skill.description || '',
      instructions: skill.instructions,
      enabled: skill.enabled,
    });
  };

  const deleteSkill = async (skill: AgentSkill) => {
    if (!window.confirm(`确认删除 Skill“${skill.name}”？`)) return;
    try {
      await agentPlatformService.deleteSkill(skill.id);
      await load();
      message.success('Skill 已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Skill 删除失败');
    }
  };

  const importSkill = async (event: FormEvent) => {
    event.preventDefault();
    setImportingSkill(true);
    try {
      await agentPlatformService.importSkill({
        sourceType: skillImportDraft.sourceType,
        content: skillImportDraft.sourceType === 'content' ? skillImportDraft.content : undefined,
        url: skillImportDraft.sourceType === 'content' ? undefined : skillImportDraft.url,
        ref: skillImportDraft.sourceType === 'github' ? skillImportDraft.ref || undefined : undefined,
        path: skillImportDraft.sourceType === 'github' ? skillImportDraft.path || undefined : undefined,
      });
      setSkillImportDraft(emptySkillImport);
      await load();
      message.success('Skill 已导入并保持禁用，请审查后再启用');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Skill 导入失败');
    } finally {
      setImportingSkill(false);
    }
  };

  const refreshSkill = async (skill: AgentSkill) => {
    setRefreshingSkillId(skill.id);
    try {
      await agentPlatformService.refreshSkill(skill.id);
      await load();
      message.success('Skill 已同步并重新设为待审查');
    } catch (error) {
      await load();
      message.error(error instanceof Error ? error.message : 'Skill 同步失败');
    } finally {
      setRefreshingSkillId(null);
    }
  };

  const mcpPayload = () => {
    const args = JSON.parse(mcpDraft.args) as unknown;
    if (!Array.isArray(args)) throw new Error('args 必须是 JSON 数组');
    const payload: Record<string, unknown> = {
      name: mcpDraft.name,
      code: mcpDraft.code,
      description: mcpDraft.description,
      transport: mcpDraft.transport,
      endpoint: mcpDraft.transport === 'stdio' ? undefined : mcpDraft.endpoint,
      command: mcpDraft.transport === 'stdio' ? mcpDraft.command : undefined,
      args,
      allowedTools: csv(mcpDraft.allowedTools),
      approvalRequiredTools: csv(mcpDraft.approvalRequiredTools),
      enabled: mcpDraft.enabled,
    };
    if (mcpDraft.headers.trim()) {
      const headers = JSON.parse(mcpDraft.headers) as unknown;
      if (!headers || Array.isArray(headers) || typeof headers !== 'object') {
        throw new Error('headers 必须是 JSON 对象');
      }
      payload.headers = headers;
    }
    if (mcpDraft.env.trim()) {
      const env = JSON.parse(mcpDraft.env) as unknown;
      if (!env || Array.isArray(env) || typeof env !== 'object') {
        throw new Error('env 必须是 JSON 对象');
      }
      payload.env = env;
    }
    return payload;
  };

  const saveMcp = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload = mcpPayload();
      if (editingMcpId) await agentPlatformService.updateMcpServer(editingMcpId, payload);
      else await agentPlatformService.createMcpServer(payload);
      setEditingMcpId(null);
      setMcpDraft(emptyMcp);
      setMcpTest(null);
      await load();
      message.success('MCP Server 已保存');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'MCP Server 保存失败');
    }
  };

  const editMcp = (server: AgentMcpServer) => {
    setEditingMcpId(server.id);
    setMcpDraft({
      name: server.name,
      code: server.code,
      description: server.description || '',
      transport: server.transport,
      endpoint: server.endpoint || '',
      command: server.command || '',
      args: JSON.stringify(server.args || [], null, 2),
      allowedTools: (server.allowedTools || []).join(', '),
      approvalRequiredTools: (server.approvalRequiredTools || []).join(', '),
      headers: '',
      env: '',
      enabled: server.enabled,
    });
    setMcpTest(null);
  };

  const testMcp = async (server: AgentMcpServer) => {
    try {
      const result = await agentPlatformService.testMcpServer(server.id);
      setMcpTest(result);
      message.success(`连接成功，发现 ${result.tools.length} 个工具`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'MCP 连接失败');
    }
  };

  const deleteMcp = async (server: AgentMcpServer) => {
    if (!window.confirm(`确认删除 MCP Server“${server.name}”？`)) return;
    try {
      await agentPlatformService.deleteMcpServer(server.id);
      await load();
      message.success('MCP Server 已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'MCP Server 删除失败');
    }
  };

  const importMcpServers = async (event: FormEvent) => {
    event.preventDefault();
    setImportingMcp(true);
    try {
      const parsed = JSON.parse(mcpImportJson) as unknown;
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new Error('MCP 配置必须是 JSON 对象');
      }
      const result = await agentPlatformService.importMcpServers({
        sourceName: mcpImportSource,
        config: parsed as Record<string, unknown>,
      });
      setMcpImportJson('');
      await load();
      message.success(`已导入 ${result.created.length} 个，跳过 ${result.skipped.length} 个；默认保持禁用`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'MCP JSON 导入失败');
    } finally {
      setImportingMcp(false);
    }
  };

  const appendRuntimeEvent = (runtimeEvent: AgentRunEvent) => {
    if (runtimeEvent.runId) setRunningRunId(runtimeEvent.runId);
    const token = runtimeEvent.data?.token;
    if (runtimeEvent.type === 'model.token' && typeof token === 'string') {
      setLiveOutput((current) => current + token);
    }
    if (!runtimeEvent.type.startsWith('stream.')) {
      setRunEvents((current) => [...current, runtimeEvent].slice(-500));
    }
  };

  const probeSelectedWorkspace = async () => {
    if (!workspaceProvider) return;
    try {
      const result = await agentPlatformService.probeWorkspace(workspaceProvider, workspaceDirectory);
      setWorkspaceProbe(result);
      message.success('SSH 工作区只读探测成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'SSH 工作区探测失败');
    }
  };

  const planAgent = async (event: FormEvent) => {
    event.preventDefault();
    setRunning(true);
    setRunningRunId(null);
    setRunEvents([]);
    setLiveOutput('');
    try {
      if (Boolean(selectedChannelId.trim()) !== Boolean(selectedModel.trim())) {
        throw new Error('channelId 与 model 必须同时填写');
      }
      const task = await agentPlatformService.planTask({
        goal: prompt,
        context: taskContext.trim() || undefined,
        threadId: threadId.trim() || undefined,
        idempotencyKey:
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        channelId: selectedChannelId ? Number(selectedChannelId) : undefined,
        model: selectedModel.trim() || undefined,
        workspaceProvider: workspaceProvider || undefined,
        workspaceDirectory: workspaceProvider ? workspaceDirectory : undefined,
        materials: taskMaterial.trim()
          ? [
              {
                key: 'user_material',
                label: '用户资料',
                value: taskMaterial,
              },
            ]
          : [],
        skillIds: selectedSkillIds,
        knowledgeBaseIds: csv(knowledgeBaseIds),
        mcpServerIds: selectedMcpIds,
      });
      setActiveTask(task);
      setActiveRun(task.run);
      setThreadId(task.run.threadId);
      setRunEvents(await agentPlatformService.listRunEvents(task.run.id));
      await load(task.run.id);
      message.success(
        task.state === 'ready'
          ? '任务计划已生成，可以开始执行'
          : task.state === 'waiting_for_input'
            ? '任务计划已生成，请补充资料'
            : '任务计划已生成，请处理审批',
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务规划失败');
    } finally {
      setRunningRunId(null);
      setRunning(false);
    }
  };

  const submitTaskInputs = async () => {
    if (!activeTask) return;
    const materials = activeTask.missingMaterials
      .map((item) => ({ key: item.key, value: taskInputDrafts[item.key]?.trim() || '' }))
      .filter((item) => item.value);
    if (!materials.length) {
      message.warning('请先填写需要补充的资料');
      return;
    }
    try {
      const task = await agentPlatformService.submitTaskInput(activeTask.run.id, materials);
      setActiveTask(task);
      setActiveRun(task.run);
      setRunEvents(await agentPlatformService.listRunEvents(task.run.id));
      message.success('资料已补充');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '资料提交失败');
    }
  };

  const decideTaskApproval = async (approvalId: string, approved: boolean) => {
    if (!activeTask) return;
    try {
      const task = await agentPlatformService.submitTaskApprovals(activeTask.run.id, [{ approvalId, approved }]);
      setActiveTask(task);
      setActiveRun(task.run);
      setRunEvents(await agentPlatformService.listRunEvents(task.run.id));
      message.success(approved ? '已批准本次操作' : '已拒绝本次操作');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审批提交失败');
    }
  };

  const continueTask = async () => {
    if (!activeTask || activeTask.state !== 'ready') return;
    setRunning(true);
    setRunningRunId(activeTask.run.id);
    setLiveOutput('');
    const controller = new AbortController();
    streamController.current = controller;
    try {
      const result = await agentPlatformService.streamTaskResume(
        activeTask.run.id,
        appendRuntimeEvent,
        controller.signal,
      );
      setActiveRun(result);
      await load(result.id);
      const task = await agentPlatformService.getTask(result.id);
      setActiveTask(task);
      if (result.status === 'completed') message.success('Agent 任务执行完成');
      else if (result.status === 'cancelled') message.info('Agent 任务已取消');
      else message.error(result.error || 'Agent 任务执行失败');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        message.error(error instanceof Error ? error.message : 'Agent 任务执行失败');
      }
      await load(activeTask.run.id);
    } finally {
      streamController.current = null;
      setRunningRunId(null);
      setRunning(false);
    }
  };

  const cancelRun = async () => {
    const id = runningRunId || (activeRun && ['pending', 'running'].includes(activeRun.status) ? activeRun.id : null);
    if (!id) return;
    try {
      const result = await agentPlatformService.cancelRun(id);
      setActiveRun(result);
      if (activeTask?.run.id === id) {
        setActiveTask(await agentPlatformService.getTask(id));
      }
      message.info(result.status === 'cancelled' ? 'Agent 运行已取消' : '已请求取消 Agent 运行');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消 Agent 运行失败');
    }
  };

  const retryRun = async () => {
    if (!activeRun || !['completed', 'failed', 'cancelled'].includes(activeRun.status)) return;
    setRunning(true);
    try {
      const result = await agentPlatformService.retryRun(activeRun.id);
      setActiveRun(result);
      setThreadId(result.threadId);
      await load(result.id);
      message.success(result.status === 'completed' ? 'Agent 重试完成' : `Agent 重试状态：${result.status}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Agent 重试失败');
    } finally {
      setRunning(false);
    }
  };

  const evaluateRun = async () => {
    if (!activeRun) return;
    const payload: Record<string, unknown> = {};
    if (evaluationDraft.label.trim()) payload.label = evaluationDraft.label.trim();
    const expectedContains = csv(evaluationDraft.expectedContains);
    const forbiddenContains = csv(evaluationDraft.forbiddenContains);
    if (expectedContains.length) payload.expectedContains = expectedContains;
    if (forbiddenContains.length) payload.forbiddenContains = forbiddenContains;
    if (evaluationDraft.minimumCitationCount) {
      payload.minimumCitationCount = Number(evaluationDraft.minimumCitationCount);
    }
    if (evaluationDraft.maximumDurationMs) {
      payload.maximumDurationMs = Number(evaluationDraft.maximumDurationMs);
    }
    try {
      const result = await agentPlatformService.evaluateRun(activeRun.id, payload);
      setEvaluations((current) => [result, ...current]);
      message.success(result.passed ? '评测通过' : '评测未通过');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Agent 评测失败');
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">LangChain + LangGraph + MCP</p>
          <h1>Agent 平台</h1>
          <p className="workspace-page__description">
            配置可执行 Skill 和 MCP 工具，选择知识库上下文，再由 LangGraph 运行并保存工具调用轨迹。
          </p>
        </div>
        <button type="button" className="workspace-button" onClick={() => void load()} disabled={loading}>
          刷新
        </button>
      </header>

      <section className="workspace-panel">
        <div className="workspace-panel__header">
          <div>
            <h2>规划并执行任务</h2>
            <p className="workspace-panel__meta">
              先生成计划和资料清单，再处理风险审批；只有已批准且在允许列表中的 MCP 工具会参与执行。
            </p>
          </div>
        </div>
        <form className="workspace-form studio-wide-form" onSubmit={planAgent}>
          <label className="workspace-field">
            任务目标
            <textarea
              className="workspace-textarea studio-agent-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
            />
          </label>
          <label className="workspace-field">
            背景与完成标准（可选）
            <textarea
              className="workspace-textarea"
              value={taskContext}
              onChange={(event) => setTaskContext(event.target.value)}
            />
          </label>
          <label className="workspace-field">
            已有资料、链接或说明（可选）
            <textarea
              className="workspace-textarea"
              value={taskMaterial}
              onChange={(event) => setTaskMaterial(event.target.value)}
            />
          </label>
          <label className="workspace-field">
            threadId（留空创建新会话）
            <input
              className="workspace-input workspace-input--mono"
              value={threadId}
              onChange={(event) => setThreadId(event.target.value)}
              maxLength={100}
            />
          </label>
          <fieldset className="rbac-fieldset">
            <legend>Skills</legend>
            <div className="rbac-checkbox-grid">
              {skills
                .filter((skill) => skill.enabled)
                .map((skill) => (
                  <label className="rbac-check" key={skill.id}>
                    <input
                      type="checkbox"
                      checked={selectedSkillIds.includes(skill.id)}
                      onChange={() => setSelectedSkillIds(toggle(selectedSkillIds, skill.id))}
                    />
                    {skill.name}
                  </label>
                ))}
            </div>
          </fieldset>
          <fieldset className="rbac-fieldset">
            <legend>MCP Servers</legend>
            <div className="rbac-checkbox-grid">
              {servers
                .filter((server) => server.enabled)
                .map((server) => (
                  <label className="rbac-check" key={server.id}>
                    <input
                      type="checkbox"
                      checked={selectedMcpIds.includes(server.id)}
                      onChange={() => setSelectedMcpIds(toggle(selectedMcpIds, server.id))}
                    />
                    {server.name}
                  </label>
                ))}
            </div>
          </fieldset>
          <fieldset className="rbac-fieldset">
            <legend>执行工作区</legend>
            <label className="workspace-field">
              工作区提供者
              <select
                className="workspace-input"
                value={workspaceProvider}
                onChange={(event) => {
                  const provider = event.target.value as '' | 'elderberry-ssh';
                  setWorkspaceProvider(provider);
                  const selected = workspaces.find((item) => item.provider === provider);
                  if (selected) setWorkspaceDirectory(selected.defaultDirectory);
                  setWorkspaceProbe(null);
                }}
              >
                <option value="">不连接执行工作区</option>
                {workspaces.map((workspace) => (
                  <option value={workspace.provider} key={workspace.provider}>
                    {workspace.name} · {workspace.target}
                  </option>
                ))}
              </select>
            </label>
            {workspaceProvider ? (
              <>
                <label className="workspace-field">
                  受限工作目录
                  <input
                    className="workspace-input workspace-input--mono"
                    value={workspaceDirectory}
                    onChange={(event) => setWorkspaceDirectory(event.target.value)}
                  />
                </label>
                <div className="workspace-inline-actions">
                  <button type="button" className="workspace-button" onClick={() => void probeSelectedWorkspace()}>
                    只读探测连接
                  </button>
                </div>
                <pre className="workspace-code studio-prewrap">
                  {JSON.stringify(workspaces.find((item) => item.provider === workspaceProvider)?.capability, null, 2)}
                </pre>
                {workspaceProbe ? (
                  <pre className="workspace-code studio-prewrap">{JSON.stringify(workspaceProbe, null, 2)}</pre>
                ) : null}
              </>
            ) : null}
          </fieldset>
          <details>
            <summary>我应该提供哪种虚拟环境？</summary>
            <p className="workspace-panel__meta">
              推荐提供 HTTPS Streamable HTTP MCP URL 和请求头。可直接接 AIO Sandbox / agent-sandbox、GitHub MCP 或自建
              MCP Runner；Vercel 只连接远程 Runner，不会在函数实例内启动 Docker。
            </p>
            {workspaceGuides ? (
              <pre className="workspace-code studio-prewrap">{JSON.stringify(workspaceGuides, null, 2)}</pre>
            ) : null}
          </details>
          <label className="workspace-field">
            知识库 ID（逗号分隔）
            <input
              className="workspace-input workspace-input--mono"
              value={knowledgeBaseIds}
              onChange={(event) => setKnowledgeBaseIds(event.target.value)}
            />
          </label>
          <div className="agent-task-columns">
            <label className="workspace-field">
              channelId（可选）
              <input
                className="workspace-input workspace-input--mono"
                inputMode="numeric"
                value={selectedChannelId}
                onChange={(event) => setSelectedChannelId(event.target.value)}
              />
            </label>
            <label className="workspace-field">
              model（与 channelId 同时填写）
              <input
                className="workspace-input workspace-input--mono"
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                maxLength={200}
              />
            </label>
          </div>
          <div className="workspace-inline-actions studio-run-actions">
            <button type="submit" className="workspace-button workspace-button--primary" disabled={running}>
              {running ? '正在规划…' : '生成任务计划'}
            </button>
            {running ? (
              <button type="button" className="workspace-button workspace-button--danger" onClick={cancelRun}>
                取消运行
              </button>
            ) : null}
            <button
              type="button"
              className="workspace-button"
              disabled={running}
              onClick={() => {
                setThreadId('');
                setActiveRun(null);
                setActiveTask(null);
                setRunEvents([]);
                setEvaluations([]);
                setLiveOutput('');
              }}
            >
              新会话
            </button>
          </div>
        </form>
      </section>

      {activeTask ? (
        <section className="workspace-panel agent-task-panel">
          <div className="workspace-panel__header">
            <div>
              <h2>任务计划</h2>
              <p className="workspace-panel__meta">
                state: {activeTask.state} · planner: {activeTask.plan.planner.source}
                {activeTask.plan.planner.model ? ` · model: ${activeTask.plan.planner.model}` : ''}
              </p>
            </div>
            <div className="workspace-inline-actions">
              {activeTask.state === 'ready' ? (
                <button
                  type="button"
                  className="workspace-button workspace-button--primary"
                  onClick={() => void continueTask()}
                  disabled={running}
                >
                  {running ? '正在执行…' : '按计划开始执行'}
                </button>
              ) : null}
              {['waiting_for_input', 'waiting_for_approval', 'ready', 'running'].includes(activeTask.state) ? (
                <button
                  type="button"
                  className="workspace-button workspace-button--danger"
                  onClick={() => void cancelRun()}
                >
                  取消任务
                </button>
              ) : null}
            </div>
          </div>
          <p className="agent-task-summary">{activeTask.plan.summary}</p>
          {activeTask.plan.capabilityWarnings.length ? (
            <div className="agent-task-warning">
              {activeTask.plan.capabilityWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
          <ol className="agent-task-steps">
            {activeTask.plan.steps.map((step) => (
              <li key={step.id}>
                <strong>{step.title}</strong>
                <span>
                  {step.kind} · {step.id}
                </span>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
          {activeTask.missingMaterials.length ? (
            <div className="agent-task-checkpoint">
              <h3>需要补充的资料</h3>
              {activeTask.missingMaterials.map((item) => (
                <label className="workspace-field" key={item.key}>
                  {item.label}（{item.key}）<span className="workspace-panel__meta">{item.description}</span>
                  <textarea
                    className="workspace-textarea"
                    value={taskInputDrafts[item.key] || ''}
                    onChange={(event) => setTaskInputDrafts({ ...taskInputDrafts, [item.key]: event.target.value })}
                  />
                </label>
              ))}
              <button
                type="button"
                className="workspace-button workspace-button--primary"
                onClick={() => void submitTaskInputs()}
              >
                提交资料
              </button>
            </div>
          ) : null}
          {activeTask.pendingApprovals.length ? (
            <div className="agent-task-checkpoint">
              <h3>等待审批</h3>
              <div className="agent-task-approval-list">
                {activeTask.pendingApprovals.map((approval) => (
                  <article key={approval.approvalId}>
                    <strong>{approval.title}</strong>
                    <span>
                      risk: {approval.risk} · toolKey: {approval.toolKey}
                    </span>
                    <p>{approval.description}</p>
                    <div className="workspace-inline-actions">
                      <button
                        type="button"
                        className="workspace-button workspace-button--primary"
                        onClick={() => void decideTaskApproval(approval.approvalId, true)}
                      >
                        仅本次批准
                      </button>
                      <button
                        type="button"
                        className="workspace-button workspace-button--danger"
                        onClick={() => void decideTaskApproval(approval.approvalId, false)}
                      >
                        拒绝
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          <details>
            <summary>风险与原始计划数据</summary>
            <pre className="workspace-code studio-prewrap">
              {JSON.stringify(
                {
                  risks: activeTask.plan.risks,
                  selected: activeTask.plan.selected,
                  workspaceProbe: activeTask.plan.workspaceProbe,
                  approvalDecisions: activeTask.approvalDecisions,
                  providedMaterialKeys: activeTask.providedMaterialKeys,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </section>
      ) : null}

      <div className="studio-shell">
        <aside className="workspace-panel studio-sidebar">
          <h2>运行记录</h2>
          <div className="studio-list studio-run-list">
            {runs.map((run) => (
              <button
                type="button"
                className="studio-list__item"
                data-active={run.id === activeRun?.id}
                key={run.id}
                onClick={() => void selectRun(run)}
              >
                <strong>{run.input}</strong>
                <span>status: {run.status}</span>
                <span>createdAt: {run.createdAt}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="workspace-panel">
          <div className="workspace-panel__header">
            <h2>运行结果</h2>
            {activeRun && ['completed', 'failed', 'cancelled'].includes(activeRun.status) ? (
              <button type="button" className="workspace-button" onClick={retryRun} disabled={running}>
                重试
              </button>
            ) : null}
          </div>
          {activeRun ? (
            <dl className="workspace-data-list studio-agent-result">
              <div>
                <dt>id</dt>
                <dd>{activeRun.id}</dd>
              </div>
              <div>
                <dt>threadId</dt>
                <dd>{activeRun.threadId}</dd>
              </div>
              <div>
                <dt>status</dt>
                <dd>{activeRun.status}</dd>
              </div>
              <div>
                <dt>output</dt>
                <dd className="studio-prewrap">{liveOutput || activeRun.output}</dd>
              </div>
              <div>
                <dt>model</dt>
                <dd>{activeRun.model}</dd>
              </div>
              <div>
                <dt>channelName</dt>
                <dd>{activeRun.channelName}</dd>
              </div>
              <div>
                <dt>usage</dt>
                <dd className="workspace-code studio-prewrap">{JSON.stringify(activeRun.usage, null, 2)}</dd>
              </div>
              <div>
                <dt>citations</dt>
                <dd className="workspace-code studio-prewrap">{JSON.stringify(activeRun.citations, null, 2)}</dd>
              </div>
              <div>
                <dt>modelCallCount / toolCallCount / eventCount</dt>
                <dd>
                  {activeRun.modelCallCount} / {activeRun.toolCallCount} / {activeRun.eventCount}
                </dd>
              </div>
              <div>
                <dt>durationMs</dt>
                <dd>{activeRun.durationMs}</dd>
              </div>
              <div>
                <dt>trace</dt>
                <dd className="workspace-code studio-prewrap">{JSON.stringify(activeRun.trace, null, 2)}</dd>
              </div>
              <div>
                <dt>error</dt>
                <dd>{activeRun.error}</dd>
              </div>
              <div>
                <dt>events</dt>
                <dd>
                  <div className="studio-event-list">
                    {runEvents.map((runtimeEvent, index) => (
                      <article
                        key={
                          runtimeEvent.id !== undefined
                            ? `persisted-${runtimeEvent.id}`
                            : `transient-${runtimeEvent.type}-${index}`
                        }
                        data-level={runtimeEvent.level || 'info'}
                      >
                        <strong>{runtimeEvent.type}</strong>
                        <span>{runtimeEvent.node}</span>
                        <span>{runtimeEvent.createdAt}</span>
                        {runtimeEvent.message ? <p>{runtimeEvent.message}</p> : null}
                        {runtimeEvent.data ? (
                          <pre className="studio-prewrap">{JSON.stringify(runtimeEvent.data, null, 2)}</pre>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </dd>
              </div>
              <div>
                <dt>evaluations</dt>
                <dd>
                  <div className="studio-evaluation">
                    <div className="studio-evaluation-form">
                      <input
                        className="workspace-input"
                        placeholder="评测标签"
                        value={evaluationDraft.label}
                        onChange={(event) => setEvaluationDraft({ ...evaluationDraft, label: event.target.value })}
                      />
                      <input
                        className="workspace-input"
                        placeholder="必须包含，逗号分隔"
                        value={evaluationDraft.expectedContains}
                        onChange={(event) =>
                          setEvaluationDraft({ ...evaluationDraft, expectedContains: event.target.value })
                        }
                      />
                      <input
                        className="workspace-input"
                        placeholder="禁止包含，逗号分隔"
                        value={evaluationDraft.forbiddenContains}
                        onChange={(event) =>
                          setEvaluationDraft({ ...evaluationDraft, forbiddenContains: event.target.value })
                        }
                      />
                      <input
                        className="workspace-input"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="最少引用数"
                        value={evaluationDraft.minimumCitationCount}
                        onChange={(event) =>
                          setEvaluationDraft({ ...evaluationDraft, minimumCitationCount: event.target.value })
                        }
                      />
                      <input
                        className="workspace-input"
                        type="number"
                        min="1"
                        max="300000"
                        placeholder="最大耗时 ms"
                        value={evaluationDraft.maximumDurationMs}
                        onChange={(event) =>
                          setEvaluationDraft({ ...evaluationDraft, maximumDurationMs: event.target.value })
                        }
                      />
                      <button type="button" className="workspace-button" onClick={evaluateRun}>
                        执行评测
                      </button>
                    </div>
                    <div className="studio-evaluation-list">
                      {evaluations.map((evaluation) => (
                        <article key={evaluation.id} data-passed={evaluation.passed}>
                          <strong>
                            {evaluation.label || evaluation.evaluator} · passed: {String(evaluation.passed)} · score:{' '}
                            {evaluation.score}
                          </strong>
                          <span>{evaluation.createdAt}</span>
                          <pre className="studio-prewrap">{JSON.stringify(evaluation.details, null, 2)}</pre>
                        </article>
                      ))}
                    </div>
                  </div>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="studio-empty">暂无运行记录</p>
          )}
        </section>
      </div>

      <div className="studio-shell">
        <section className="workspace-panel">
          <div className="workspace-panel__header">
            <div>
              <h2>Skills</h2>
              <p className="workspace-panel__meta">{skills.length} 个</p>
            </div>
          </div>
          <div className="studio-registry-list">
            {skills.map((skill) => (
              <article key={skill.id}>
                <div>
                  <strong>{skill.name}</strong>
                  <span>
                    {skill.code} · enabled: {String(skill.enabled)}
                  </span>
                  <span>
                    sourceType: {skill.source?.type || 'manual'} · syncStatus: {skill.source?.status || 'manual'}
                  </span>
                  {skill.source ? (
                    <>
                      <span>sourceUrl: {skill.source.url}</span>
                      <span>ref: {skill.source.ref}</span>
                      <span>path: {skill.source.path}</span>
                      <span>contentHash: {skill.source.contentHash}</span>
                      <span>syncedAt: {skill.source.syncedAt}</span>
                      <span>reviewStatus: {skill.reviewStatus || 'pending'}</span>
                      {skill.source.error ? <span>syncError: {skill.source.error}</span> : null}
                    </>
                  ) : null}
                </div>
                <div className="workspace-inline-actions">
                  {skill.source && skill.source.type !== 'content' ? (
                    <button
                      type="button"
                      className="workspace-button"
                      disabled={refreshingSkillId === skill.id}
                      onClick={() => void refreshSkill(skill)}
                    >
                      {refreshingSkillId === skill.id ? '同步中…' : '刷新来源'}
                    </button>
                  ) : null}
                  <button type="button" className="workspace-button" onClick={() => editSkill(skill)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="workspace-button workspace-button--danger"
                    onClick={() => deleteSkill(skill)}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
          <details className="agent-open-import">
            <summary>从开源 SKILL.md 导入</summary>
            <form className="workspace-form agent-open-import__form" onSubmit={importSkill}>
              <p className="workspace-panel__meta">
                支持粘贴原文、HTTPS 原始文件 URL、GitHub 仓库或文件 URL。只读取 SKILL.md，不下载或执行 scripts。
                导入和刷新后默认禁用，需检查指令后手动启用。
              </p>
              <label className="workspace-field">
                导入方式
                <select
                  className="workspace-input"
                  value={skillImportDraft.sourceType}
                  onChange={(event) =>
                    setSkillImportDraft({
                      ...skillImportDraft,
                      sourceType: event.target.value as typeof skillImportDraft.sourceType,
                    })
                  }
                >
                  <option value="content">SKILL.md 原文</option>
                  <option value="url">HTTPS URL</option>
                  <option value="github">GitHub 仓库 / 文件</option>
                </select>
              </label>
              {skillImportDraft.sourceType === 'content' ? (
                <label className="workspace-field">
                  SKILL.md 原文
                  <textarea
                    className="workspace-textarea workspace-input--mono agent-open-import__source"
                    value={skillImportDraft.content}
                    onChange={(event) => setSkillImportDraft({ ...skillImportDraft, content: event.target.value })}
                    placeholder={
                      '---\nname: example-skill\ndescription: What this skill does and when to use it.\n---\n\n# Instructions'
                    }
                    required
                  />
                </label>
              ) : (
                <label className="workspace-field">
                  {skillImportDraft.sourceType === 'github' ? 'GitHub URL' : 'SKILL.md HTTPS URL'}
                  <input
                    className="workspace-input workspace-input--mono"
                    type="url"
                    value={skillImportDraft.url}
                    onChange={(event) => setSkillImportDraft({ ...skillImportDraft, url: event.target.value })}
                    placeholder={
                      skillImportDraft.sourceType === 'github'
                        ? 'https://github.com/owner/repository'
                        : 'https://example.com/SKILL.md'
                    }
                    required
                  />
                </label>
              )}
              {skillImportDraft.sourceType === 'github' ? (
                <div className="agent-open-import__columns">
                  <label className="workspace-field">
                    ref（可选）
                    <input
                      className="workspace-input workspace-input--mono"
                      value={skillImportDraft.ref}
                      onChange={(event) => setSkillImportDraft({ ...skillImportDraft, ref: event.target.value })}
                      placeholder="main"
                    />
                  </label>
                  <label className="workspace-field">
                    path（可选）
                    <input
                      className="workspace-input workspace-input--mono"
                      value={skillImportDraft.path}
                      onChange={(event) => setSkillImportDraft({ ...skillImportDraft, path: event.target.value })}
                      placeholder="skills/example/SKILL.md"
                    />
                  </label>
                </div>
              ) : null}
              <button type="submit" className="workspace-button workspace-button--primary" disabled={importingSkill}>
                {importingSkill ? '导入中…' : '导入并等待审查'}
              </button>
            </form>
          </details>
          <form className="workspace-form studio-create-form" onSubmit={saveSkill}>
            <h2>{editingSkillId ? '编辑 Skill' : '新建 Skill'}</h2>
            <label className="workspace-field">
              名称
              <input
                className="workspace-input"
                value={skillDraft.name}
                onChange={(event) => setSkillDraft({ ...skillDraft, name: event.target.value })}
                required
              />
            </label>
            <label className="workspace-field">
              code
              <input
                className="workspace-input workspace-input--mono"
                value={skillDraft.code}
                onChange={(event) => setSkillDraft({ ...skillDraft, code: event.target.value })}
                required
              />
            </label>
            <label className="workspace-field">
              描述
              <input
                className="workspace-input"
                value={skillDraft.description}
                onChange={(event) => setSkillDraft({ ...skillDraft, description: event.target.value })}
              />
            </label>
            <label className="workspace-field">
              指令
              <textarea
                className="workspace-textarea studio-instruction-editor"
                value={skillDraft.instructions}
                onChange={(event) => setSkillDraft({ ...skillDraft, instructions: event.target.value })}
                required
              />
            </label>
            <label className="rbac-check">
              <input
                type="checkbox"
                checked={skillDraft.enabled}
                onChange={(event) => setSkillDraft({ ...skillDraft, enabled: event.target.checked })}
              />
              enabled
            </label>
            <div className="workspace-inline-actions">
              <button type="submit" className="workspace-button workspace-button--primary">
                保存 Skill
              </button>
              {editingSkillId && (
                <button
                  type="button"
                  className="workspace-button"
                  onClick={() => {
                    setEditingSkillId(null);
                    setSkillDraft(emptySkill);
                  }}
                >
                  取消
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="workspace-panel">
          <div className="workspace-panel__header">
            <div>
              <h2>MCP Servers</h2>
              <p className="workspace-panel__meta">{servers.length} 个</p>
            </div>
          </div>
          <div className="studio-registry-list">
            {servers.map((server) => (
              <article key={server.id}>
                <div>
                  <strong>{server.name}</strong>
                  <span>
                    {server.transport} · hasSecrets: {String(server.hasSecrets)}
                  </span>
                  <span>
                    sourceType: {server.sourceType} · sourceName: {server.sourceName} · importedAt: {server.importedAt}
                  </span>
                  <span>allowedTools: {JSON.stringify(server.allowedTools)}</span>
                  <span>approvalRequiredTools: {JSON.stringify(server.approvalRequiredTools)}</span>
                </div>
                <div className="workspace-inline-actions">
                  <button type="button" className="workspace-button" onClick={() => testMcp(server)}>
                    测试并发现工具
                  </button>
                  <button type="button" className="workspace-button" onClick={() => editMcp(server)}>
                    编辑
                  </button>
                  <button
                    type="button"
                    className="workspace-button workspace-button--danger"
                    onClick={() => deleteMcp(server)}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
          {mcpTest && <pre className="watch-code studio-mcp-test">{JSON.stringify(mcpTest, null, 2)}</pre>}
          <details className="agent-open-import">
            <summary>导入主流客户端 MCP JSON</summary>
            <form className="workspace-form agent-open-import__form" onSubmit={importMcpServers}>
              <p className="workspace-panel__meta">
                支持 Claude、Cursor、Cline、VS Code、Open WebUI、Cherry Studio 使用的顶层 mcpServers、servers、单个
                Server 或直接 Server 映射。可导入 stdio、Streamable HTTP 和 legacy SSE。Dify 对外暴露的标准 MCP Server
                URL 可以连接，但 Dify 插件本身不能直接在这里运行。 所有导入项默认禁用，密钥只会加密保存且不会回显。
              </p>
              <label className="workspace-field">
                配置来源
                <select
                  className="workspace-input"
                  value={mcpImportSource}
                  onChange={(event) => setMcpImportSource(event.target.value)}
                >
                  <option value="generic">通用 / VS Code / GitHub</option>
                  <option value="claude">Claude</option>
                  <option value="cursor">Cursor</option>
                  <option value="cline">Cline</option>
                  <option value="dify">Dify MCP Server</option>
                  <option value="open-webui">Open WebUI</option>
                  <option value="cherry-studio">Cherry Studio</option>
                </select>
              </label>
              <label className="workspace-field">
                MCP JSON
                <textarea
                  className="workspace-textarea workspace-input--mono agent-open-import__json"
                  value={mcpImportJson}
                  onChange={(event) => setMcpImportJson(event.target.value)}
                  placeholder={
                    '{\n  "mcpServers": {\n    "example": {\n      "url": "https://example.com/mcp"\n    }\n  }\n}'
                  }
                  required
                />
              </label>
              <button type="submit" className="workspace-button workspace-button--primary" disabled={importingMcp}>
                {importingMcp ? '导入中…' : '导入为禁用配置'}
              </button>
            </form>
          </details>
          <form className="workspace-form studio-create-form" onSubmit={saveMcp}>
            <h2>{editingMcpId ? '编辑 MCP Server' : '新建 MCP Server'}</h2>
            <label className="workspace-field">
              名称
              <input
                className="workspace-input"
                value={mcpDraft.name}
                onChange={(event) => setMcpDraft({ ...mcpDraft, name: event.target.value })}
                required
              />
            </label>
            <label className="workspace-field">
              code
              <input
                className="workspace-input workspace-input--mono"
                value={mcpDraft.code}
                onChange={(event) => setMcpDraft({ ...mcpDraft, code: event.target.value })}
                required
              />
            </label>
            <label className="workspace-field">
              transport
              <select
                className="workspace-input"
                value={mcpDraft.transport}
                onChange={(event) =>
                  setMcpDraft({ ...mcpDraft, transport: event.target.value as AgentMcpServer['transport'] })
                }
              >
                <option value="streamable-http">streamable-http</option>
                <option value="sse">sse</option>
                <option value="stdio">stdio</option>
              </select>
            </label>
            {mcpDraft.transport === 'stdio' ? (
              <label className="workspace-field">
                command
                <input
                  className="workspace-input workspace-input--mono"
                  value={mcpDraft.command}
                  onChange={(event) => setMcpDraft({ ...mcpDraft, command: event.target.value })}
                  required
                />
              </label>
            ) : (
              <label className="workspace-field">
                endpoint
                <input
                  className="workspace-input workspace-input--mono"
                  value={mcpDraft.endpoint}
                  onChange={(event) => setMcpDraft({ ...mcpDraft, endpoint: event.target.value })}
                  required
                />
              </label>
            )}
            <label className="workspace-field">
              args（JSON 数组）
              <textarea
                className="workspace-textarea workspace-input--mono"
                value={mcpDraft.args}
                onChange={(event) => setMcpDraft({ ...mcpDraft, args: event.target.value })}
              />
            </label>
            <label className="workspace-field">
              允许工具（逗号分隔）
              <input
                className="workspace-input workspace-input--mono"
                value={mcpDraft.allowedTools}
                onChange={(event) => setMcpDraft({ ...mcpDraft, allowedTools: event.target.value })}
              />
            </label>
            <label className="workspace-field">
              强制逐次批准的工具（必须已在允许列表，逗号分隔）
              <input
                className="workspace-input workspace-input--mono"
                value={mcpDraft.approvalRequiredTools}
                onChange={(event) => setMcpDraft({ ...mcpDraft, approvalRequiredTools: event.target.value })}
              />
            </label>
            <label className="workspace-field">
              headers（加密保存的 JSON）
              <textarea
                className="workspace-textarea workspace-input--mono"
                value={mcpDraft.headers}
                onChange={(event) => setMcpDraft({ ...mcpDraft, headers: event.target.value })}
              />
            </label>
            <label className="workspace-field">
              env（加密保存的 JSON）
              <textarea
                className="workspace-textarea workspace-input--mono"
                value={mcpDraft.env}
                onChange={(event) => setMcpDraft({ ...mcpDraft, env: event.target.value })}
              />
            </label>
            <label className="rbac-check">
              <input
                type="checkbox"
                checked={mcpDraft.enabled}
                onChange={(event) => setMcpDraft({ ...mcpDraft, enabled: event.target.checked })}
              />
              enabled
            </label>
            <div className="workspace-inline-actions">
              <button type="submit" className="workspace-button workspace-button--primary">
                保存 MCP Server
              </button>
              {editingMcpId && (
                <button
                  type="button"
                  className="workspace-button"
                  onClick={() => {
                    setEditingMcpId(null);
                    setMcpDraft(emptyMcp);
                  }}
                >
                  取消
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
