import { message } from 'antd';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  type AgentEvaluation,
  type AgentMcpServer,
  type AgentRun,
  type AgentRunEvent,
  type AgentSkill,
  agentPlatformService,
  type McpTestResult,
} from '../../services/agentPlatformService';
import '../rbac-admin.css';
import '../studio.css';

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

const csv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

export default function AgentPlatform() {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [servers, setServers] = useState<AgentMcpServer[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [skillDraft, setSkillDraft] = useState(emptySkill);
  const [mcpDraft, setMcpDraft] = useState(emptyMcp);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingMcpId, setEditingMcpId] = useState<string | null>(null);
  const [mcpTest, setMcpTest] = useState<McpTestResult | null>(null);
  const [prompt, setPrompt] = useState('');
  const [knowledgeBaseIds, setKnowledgeBaseIds] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedMcpIds, setSelectedMcpIds] = useState<string[]>([]);
  const [approvedToolKeys, setApprovedToolKeys] = useState<string[]>([]);
  const [activeRun, setActiveRun] = useState<AgentRun | null>(null);
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
  const streamController = useRef<AbortController | null>(null);

  const selectRun = async (run: AgentRun) => {
    setActiveRun(run);
    setLiveOutput('');
    try {
      const [details, events, evaluationRows] = await Promise.all([
        agentPlatformService.getRun(run.id),
        agentPlatformService.listRunEvents(run.id),
        agentPlatformService.listEvaluations(run.id),
      ]);
      setActiveRun(details);
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
      const [skillRows, serverRows, runRows] = await Promise.all([
        agentPlatformService.listSkills(),
        agentPlatformService.listMcpServers(),
        agentPlatformService.listRuns(),
      ]);
      setSkills(skillRows);
      setServers(serverRows);
      setRuns(runRows);
      const selected = runRows.find((row) => row.id === (preferredRunId || activeRun?.id)) || runRows[0] || null;
      setActiveRun(selected);
      if (selected) {
        const [details, events, evaluationRows] = await Promise.all([
          agentPlatformService.getRun(selected.id),
          agentPlatformService.listRunEvents(selected.id),
          agentPlatformService.listEvaluations(selected.id),
        ]);
        setActiveRun(details);
        setRunEvents(events);
        setEvaluations(evaluationRows);
      } else {
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

  const runAgent = async (event: FormEvent) => {
    event.preventDefault();
    setRunning(true);
    setRunningRunId(null);
    setRunEvents([]);
    setLiveOutput('');
    const controller = new AbortController();
    streamController.current = controller;
    try {
      const result = await agentPlatformService.streamRun(
        {
          input: prompt,
          threadId: threadId.trim() || undefined,
          idempotencyKey:
            typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          skillIds: selectedSkillIds,
          knowledgeBaseIds: csv(knowledgeBaseIds),
          mcpServerIds: selectedMcpIds,
          approvedToolKeys,
        },
        (runtimeEvent) => {
          if (runtimeEvent.runId) setRunningRunId(runtimeEvent.runId);
          const token = runtimeEvent.data?.token;
          if (runtimeEvent.type === 'model.token' && typeof token === 'string') {
            setLiveOutput((current) => current + token);
          }
          if (!runtimeEvent.type.startsWith('stream.')) {
            setRunEvents((current) => [...current, runtimeEvent].slice(-500));
          }
        },
        controller.signal,
      );
      setActiveRun(result);
      setThreadId(result.threadId);
      setPrompt('');
      await load(result.id);
      if (result.status === 'completed') message.success('Agent 运行完成');
      else if (result.status === 'cancelled') message.info('Agent 运行已取消');
      else message.error(result.error || 'Agent 运行失败');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        message.error(error instanceof Error ? error.message : 'Agent 运行失败');
      }
      await load();
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
            <h2>运行 Agent</h2>
            <p className="workspace-panel__meta">只有 MCP Server 允许列表中的工具会暴露给模型。</p>
          </div>
        </div>
        <form className="workspace-form studio-wide-form" onSubmit={runAgent}>
          <label className="workspace-field">
            任务
            <textarea
              className="workspace-textarea studio-agent-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              required
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
          {selectedMcpIds.length ? (
            <fieldset className="rbac-fieldset">
              <legend>本次批准的 MCP 工具</legend>
              <p className="workspace-panel__meta">
                未声明只读的工具默认需要本次明确批准；未批准的工具不会暴露给模型。
              </p>
              <div className="rbac-checkbox-grid">
                {servers
                  .filter((server) => selectedMcpIds.includes(server.id))
                  .flatMap((server) =>
                    (server.allowedTools || []).map((toolName) => {
                      const toolKey = `${server.id}:${toolName}`;
                      return (
                        <label className="rbac-check" key={toolKey}>
                          <input
                            type="checkbox"
                            checked={approvedToolKeys.includes(toolKey)}
                            onChange={() => setApprovedToolKeys(toggle(approvedToolKeys, toolKey))}
                          />
                          {server.code}:{toolName}
                        </label>
                      );
                    }),
                  )}
              </div>
            </fieldset>
          ) : null}
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
          <label className="workspace-field">
            知识库 ID（逗号分隔）
            <input
              className="workspace-input workspace-input--mono"
              value={knowledgeBaseIds}
              onChange={(event) => setKnowledgeBaseIds(event.target.value)}
            />
          </label>
          <div className="workspace-inline-actions studio-run-actions">
            <button type="submit" className="workspace-button workspace-button--primary" disabled={running}>
              {running ? 'Agent 正在执行…' : '运行'}
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
                </div>
                <div className="workspace-inline-actions">
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
