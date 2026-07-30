import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Agent, AgentRuntime, Conversation, Project, WorkspaceBootstrap } from '../domain';
import { useAgentWorkspaceClient, useMemories, useMessages, useRuns } from '../data/context';
import { MessageComposer } from '../components/MessageComposer';
import {
  AgentAvatar,
  ActionNotice,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingState,
  PageHeader,
  RawValue,
  Status,
} from '../components/Primitives';
import { workspacePath } from '../components/paths';
import { createMutationId } from '../components/mutations';

const parseJson = <T,>(value: string, label: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label}: invalid JSON`);
  }
};

function CreateAgentForm({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  const client = useAgentWorkspaceClient();
  const [projectId, setProjectId] = useState(snapshot.projects[0]?.id ?? '');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [runtime, setRuntime] = useState<AgentRuntime>('codex');
  const [model, setModel] = useState('');
  const [computerId, setComputerId] = useState('');
  const [policy, setPolicy] = useState<Agent['policy']>('project_owner');
  const [budget, setBudget] = useState('{}');
  const [repositoryIds, setRepositoryIds] = useState('[]');
  const [skills, setSkills] = useState('[]');
  const [mcpServers, setMcpServers] = useState('[]');
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    try {
      await client.createAgent({
        projectId,
        name,
        handle,
        description,
        runtime,
        model,
        computerId: computerId || null,
        policy,
        budget: parseJson<Agent['budget']>(budget, 'budget'),
        repositoryIds: parseJson<string[]>(repositoryIds, 'repositoryIds'),
        skills: parseJson<string[]>(skills, 'skills'),
        mcpServers: parseJson<string[]>(mcpServers, 'mcpServers'),
        clientMutationId: createMutationId(),
      });
      setName('');
      setHandle('');
      setDescription('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <details className="aw-card">
      <summary>新建 Agent</summary>
      <form className="aw-settings-section" onSubmit={submit}>
        <ActionNotice message={notice} />
        <label className="aw-field">
          <span>projectId</span>
          <select className="aw-select" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {snapshot.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} · {project.id}
              </option>
            ))}
          </select>
        </label>
        {[
          ['name', name, setName],
          ['handle', handle, setHandle],
          ['description', description, setDescription],
          ['model', model, setModel],
        ].map(([label, value, setter]) => (
          <label className="aw-field" key={label as string}>
            <span>{label as string}</span>
            <input
              className="aw-input"
              value={value as string}
              onChange={(event) => (setter as (next: string) => void)(event.target.value)}
            />
          </label>
        ))}
        <label className="aw-field">
          <span>runtime</span>
          <select
            className="aw-select"
            value={runtime}
            onChange={(event) => setRuntime(event.target.value as AgentRuntime)}
          >
            <option>codex</option>
            <option>claude-code</option>
          </select>
        </label>
        <label className="aw-field">
          <span>computerId</span>
          <select className="aw-select" value={computerId} onChange={(event) => setComputerId(event.target.value)}>
            <option value="">null</option>
            {snapshot.computers.map((computer) => (
              <option key={computer.id} value={computer.id}>
                {computer.name} · {computer.status}
              </option>
            ))}
          </select>
        </label>
        <label className="aw-field">
          <span>policy</span>
          <select
            className="aw-select"
            value={policy}
            onChange={(event) => setPolicy(event.target.value as Agent['policy'])}
          >
            <option>project_owner</option>
            <option>host_owner</option>
          </select>
        </label>
        {[
          ['budget', budget, setBudget],
          ['repositoryIds', repositoryIds, setRepositoryIds],
          ['skills', skills, setSkills],
          ['mcpServers', mcpServers, setMcpServers],
        ].map(([label, value, setter]) => (
          <label className="aw-field" key={label as string}>
            <span>{label as string} JSON</span>
            <textarea
              className="aw-textarea"
              value={value as string}
              onChange={(event) => (setter as (next: string) => void)(event.target.value)}
            />
          </label>
        ))}
        <button
          className="aw-button aw-button--primary"
          disabled={!projectId || !name.trim() || !handle.trim() || !model.trim()}
        >
          创建
        </button>
      </form>
    </details>
  );
}

export function AgentsPage({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  return (
    <section className="aw-page">
      <PageHeader title="Agents" subtitle={`${snapshot.agents.length} persistent agents`} />
      <CreateAgentForm snapshot={snapshot} />
      {snapshot.agents.length === 0 ? (
        <EmptyState title="暂无 Agent" />
      ) : (
        <div className="aw-agent-grid">
          {snapshot.agents.map((agent) => {
            const computer = snapshot.computers.find((item) => item.id === agent.computerId);
            return (
              <article className="aw-agent-card" key={agent.id}>
                <div className="aw-card-header">
                  <div className="aw-card-header">
                    <AgentAvatar name={agent.name} />
                    <div>
                      <h2 className="aw-card-title">
                        <Link className="aw-link" to={workspacePath(`/agents/${agent.id}`)}>
                          {agent.name}
                        </Link>
                      </h2>
                      <span>{agent.handle}</span>
                    </div>
                  </div>
                  <Status value={agent.status} />
                </div>
                <p>{agent.description}</p>
                <KeyValue
                  entries={[
                    { label: 'runtime', value: agent.runtime },
                    { label: 'model', value: agent.model },
                    { label: 'sessionId', value: agent.sessionId },
                    { label: 'sessionStatus', value: agent.sessionStatus },
                    { label: 'computerId', value: agent.computerId, node: computer?.name },
                    { label: 'inboxCount', value: agent.inboxCount },
                    { label: 'currentRunId', value: agent.currentRunId },
                    { label: 'policy', value: agent.policy },
                    { label: 'configurationVersion', value: agent.configurationVersion },
                  ]}
                />
                <Link className="aw-button aw-button--primary" to={workspacePath(`/agents/${agent.id}`)}>
                  打开 Agent
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function AgentDetailPage({ snapshot, agentId }: { snapshot: WorkspaceBootstrap; agentId: string }) {
  const agent = snapshot.agents.find((item) => item.id === agentId);
  if (!agent) return <EmptyState title="Agent 不存在" detail={agentId} />;
  return <AgentDetailContent snapshot={snapshot} agent={agent} />;
}

function AgentDm({ agent, dm, project }: { agent: Agent; dm: Conversation; project: Project }) {
  const messagesQuery = useMessages(project.id, dm.id, { limit: 50 });
  if (messagesQuery.isPending) return <LoadingState />;
  if (messagesQuery.isError)
    return <ErrorState error={messagesQuery.error} retry={() => void messagesQuery.refetch()} />;
  return (
    <>
      <div className="aw-message-list">
        {messagesQuery.data.items.map((message) => (
          <article
            className={`aw-message${message.actorType === 'agent' ? ' aw-message--agent' : ''}`}
            key={message.id}
          >
            <div className="aw-message-header">
              <strong>{message.actorType === 'agent' ? agent.handle : message.actorType}</strong>
              <Status value={message.status} />
              <span>{message.createdAt}</span>
            </div>
            <p className="aw-message-body">{message.content}</p>
          </article>
        ))}
      </div>
      <MessageComposer project={project} conversation={dm} agents={[agent]} />
    </>
  );
}

function AgentDetailContent({ snapshot, agent }: { snapshot: WorkspaceBootstrap; agent: Agent }) {
  const client = useAgentWorkspaceClient();
  const computer = snapshot.computers.find((item) => item.id === agent.computerId);
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [model, setModel] = useState(agent.model);
  const [computerId, setComputerId] = useState(agent.computerId ?? '');
  const [policy, setPolicy] = useState<Agent['policy']>(agent.policy);
  const [budget, setBudget] = useState(JSON.stringify(agent.budget, null, 2));
  const [repositoryIds, setRepositoryIds] = useState(JSON.stringify(agent.repositoryIds, null, 2));
  const [skills, setSkills] = useState(JSON.stringify(agent.skills, null, 2));
  const [mcpServers, setMcpServers] = useState(JSON.stringify(agent.mcpServers, null, 2));
  const [notice, setNotice] = useState<string | null>(null);
  const runsQuery = useRuns(agent.projectId, { limit: 50 });
  const memoriesQuery = useMemories(agent.projectId, { limit: 50 });
  const runs = (runsQuery.data?.items ?? []).filter((run) => run.agentId === agent.id);
  const memories = (memoriesQuery.data?.items ?? []).filter((memory) => memory.agentId === agent.id);
  const dm = snapshot.conversations.find(
    (conversation) => conversation.type === 'agent_dm' && conversation.agentIds.includes(agent.id),
  );
  const project = dm ? snapshot.projects.find((item) => item.id === dm.projectId) : null;

  const action = async (operation: () => Promise<unknown>) => {
    setNotice(null);
    try {
      await operation();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    void action(() =>
      client.updateAgent(agent.id, {
        name,
        description,
        model,
        computerId: computerId || null,
        policy,
        budget: parseJson<Agent['budget']>(budget, 'budget'),
        repositoryIds: parseJson<string[]>(repositoryIds, 'repositoryIds'),
        skills: parseJson<string[]>(skills, 'skills'),
        mcpServers: parseJson<string[]>(mcpServers, 'mcpServers'),
        expectedVersion: agent.version,
        clientMutationId: createMutationId(),
      }),
    );
  };

  return (
    <section className="aw-page">
      <PageHeader
        title={
          <span className="aw-card-header">
            <AgentAvatar name={agent.name} />
            {agent.name}
          </span>
        }
        subtitle={`${agent.handle} · ${agent.id}`}
        actions={<Status value={agent.status} />}
      />
      <ActionNotice message={notice} />
      <details className="aw-card">
        <summary>Agent 配置与生命周期</summary>
        <form className="aw-settings-section" onSubmit={save}>
          {[
            ['name', name, setName],
            ['description', description, setDescription],
            ['model', model, setModel],
          ].map(([label, value, setter]) => (
            <label className="aw-field" key={label as string}>
              <span>{label as string}</span>
              <input
                className="aw-input"
                value={value as string}
                onChange={(event) => (setter as (next: string) => void)(event.target.value)}
              />
            </label>
          ))}
          <label className="aw-field">
            <span>computerId</span>
            <select className="aw-select" value={computerId} onChange={(event) => setComputerId(event.target.value)}>
              <option value="">null</option>
              {snapshot.computers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.status}
                </option>
              ))}
            </select>
          </label>
          <label className="aw-field">
            <span>policy</span>
            <select
              className="aw-select"
              value={policy}
              onChange={(event) => setPolicy(event.target.value as Agent['policy'])}
            >
              <option>project_owner</option>
              <option>host_owner</option>
            </select>
          </label>
          {[
            ['budget', budget, setBudget],
            ['repositoryIds', repositoryIds, setRepositoryIds],
            ['skills', skills, setSkills],
            ['mcpServers', mcpServers, setMcpServers],
          ].map(([label, value, setter]) => (
            <label className="aw-field" key={label as string}>
              <span>{label as string} JSON</span>
              <textarea
                className="aw-textarea"
                value={value as string}
                onChange={(event) => (setter as (next: string) => void)(event.target.value)}
              />
            </label>
          ))}
          <div className="aw-toolbar">
            <button className="aw-button aw-button--primary">保存</button>
            <button
              className="aw-button"
              type="button"
              onClick={() =>
                void action(() =>
                  client.setAgentEnabled(agent.id, {
                    enabled: !agent.enabled,
                    expectedVersion: agent.version,
                    clientMutationId: createMutationId(),
                  }),
                )
              }
            >
              enabled: {String(agent.enabled)}
            </button>
            <button
              className="aw-button"
              type="button"
              onClick={() =>
                void action(() =>
                  client.restartAgent(agent.id, {
                    expectedVersion: agent.version,
                    clientMutationId: createMutationId(),
                  }),
                )
              }
            >
              Restart
            </button>
            <button
              className="aw-button"
              type="button"
              onClick={() => {
                if (!window.confirm(`Reset Session ${agent.id}？`)) return;
                void action(() =>
                  client.resetAgentSession(agent.id, {
                    expectedVersion: agent.version,
                    clientMutationId: createMutationId(),
                  }),
                );
              }}
            >
              Session Reset
            </button>
            <button
              className="aw-button aw-button--danger"
              type="button"
              onClick={() => {
                if (!window.confirm(`Full Reset ${agent.id}：Workspace 和 Memory 将被清理。`)) return;
                void action(() =>
                  client.fullResetAgent(agent.id, {
                    expectedVersion: agent.version,
                    clientMutationId: createMutationId(),
                  }),
                );
              }}
            >
              Full Reset
            </button>
          </div>
        </form>
      </details>
      <div className="aw-detail-grid">
        <article className="aw-card">
          <h2>Identity & Runtime</h2>
          <p>{agent.description}</p>
          <KeyValue
            entries={[
              { label: 'runtime', value: agent.runtime },
              { label: 'model', value: agent.model },
              { label: 'computerId', value: agent.computerId, node: computer?.name },
              { label: 'sessionId', value: agent.sessionId },
              { label: 'sessionStatus', value: agent.sessionStatus },
              { label: 'configurationVersion', value: agent.configurationVersion },
              { label: 'inboxCount', value: agent.inboxCount },
              { label: 'currentRunId', value: agent.currentRunId },
              { label: 'policy', value: agent.policy },
              { label: 'repositoryIds', value: agent.repositoryIds },
            ]}
          />
          <h3>budget</h3>
          <RawValue value={agent.budget} />
          <h3>skills</h3>
          <RawValue value={agent.skills} />
          <h3>mcpServers</h3>
          <RawValue value={agent.mcpServers} />
        </article>

        <article className="aw-card">
          <h2>Runs</h2>
          {runsQuery.isPending ? (
            <LoadingState />
          ) : runsQuery.isError ? (
            <ErrorState error={runsQuery.error} retry={() => void runsQuery.refetch()} />
          ) : runs.length === 0 ? (
            <RawValue value={null} />
          ) : (
            <div className="aw-list">
              {runs.map((run) => (
                <Link
                  className="aw-list-item"
                  key={run.id}
                  to={workspacePath(`/projects/${run.projectId}/runs/${run.id}`)}
                >
                  <span>{run.id}</span>
                  <Status value={run.status} />
                </Link>
              ))}
            </div>
          )}
          <h2>Private Memory</h2>
          {memoriesQuery.isPending ? (
            <LoadingState />
          ) : memoriesQuery.isError ? (
            <ErrorState error={memoriesQuery.error} retry={() => void memoriesQuery.refetch()} />
          ) : (
            memories.map((memory) => (
              <article className="aw-memory-item" key={memory.id}>
                <p>{memory.content}</p>
                <span className="aw-meta">
                  {memory.provenanceType} · {String(memory.provenanceId)} · {memory.createdAt}
                </span>
              </article>
            ))
          )}
        </article>
      </div>

      <section className="aw-card">
        <h2>Agent DM</h2>
        {!dm || !project ? (
          <EmptyState title="没有可用的 agent_dm Conversation" />
        ) : (
          <>
            <AgentDm agent={agent} dm={dm} project={project} />
          </>
        )}
      </section>
    </section>
  );
}
