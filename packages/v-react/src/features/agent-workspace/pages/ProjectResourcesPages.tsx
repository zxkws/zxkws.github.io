import { FormEvent, useState } from 'react';
import type { Automation, AutomationTrigger, Repository, WorkspaceBootstrap } from '../domain';
import { useAgentWorkspaceClient, useAutomations, useMemories, useProjectOverview } from '../data/context';
import {
  ActionNotice,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingState,
  PageHeader,
  RawValue,
  Status,
} from '../components/Primitives';
import { ProjectTabs } from '../components/WorkspaceLayout';
import { createMutationId } from '../components/mutations';
import { CursorPager } from '../components/CursorPager';

function AutomationForm({
  snapshot,
  projectId,
  automation,
  onNotice,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  automation?: Automation;
  onNotice: (notice: string | null) => void;
}) {
  const client = useAgentWorkspaceClient();
  const projectAgents = snapshot.agents.filter((agent) => agent.projectId === projectId);
  const [name, setName] = useState(automation?.name ?? '');
  const [trigger, setTrigger] = useState(
    JSON.stringify(automation?.trigger ?? { type: 'schedule', cron: '', timezone: '' }, null, 2),
  );
  const [instruction, setInstruction] = useState(automation?.instruction ?? '');
  const [repositoryIds, setRepositoryIds] = useState(JSON.stringify(automation?.repositoryIds ?? [], null, 2));
  const [agentId, setAgentId] = useState(automation?.agentId ?? projectAgents[0]?.id ?? '');
  const [taskPolicy, setTaskPolicy] = useState<Automation['taskPolicy']>(automation?.taskPolicy ?? 'create_task');
  const [deliveryPolicy, setDeliveryPolicy] = useState<Automation['deliveryPolicy']>(
    automation?.deliveryPolicy ?? 'change_set_only',
  );
  const [missedRunPolicy, setMissedRunPolicy] = useState<Automation['missedRunPolicy']>(
    automation?.missedRunPolicy ?? 'skip',
  );
  const [enabled, setEnabled] = useState(automation?.enabled ?? true);

  const action = async (operation: () => Promise<unknown>) => {
    onNotice(null);
    try {
      await operation();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    let parsedTrigger: AutomationTrigger;
    let parsedRepositoryIds: string[];
    try {
      parsedTrigger = JSON.parse(trigger) as AutomationTrigger;
      parsedRepositoryIds = JSON.parse(repositoryIds) as string[];
    } catch {
      onNotice('trigger/repositoryIds: invalid JSON');
      return;
    }
    const common = {
      name,
      trigger: parsedTrigger,
      instruction,
      repositoryIds: parsedRepositoryIds,
      agentId,
      taskPolicy,
      deliveryPolicy,
      missedRunPolicy,
      enabled,
    };
    if (automation) {
      void action(() =>
        client.updateAutomation(automation.id, {
          ...common,
          expectedVersion: automation.version,
          clientMutationId: createMutationId(),
        }),
      );
    } else {
      void action(() =>
        client.createAutomation({
          projectId,
          ...common,
          clientMutationId: createMutationId(),
        }),
      );
    }
  };

  return (
    <details className="aw-card">
      <summary>{automation ? `编辑 ${automation.name}` : '新建 Automation'}</summary>
      <form className="aw-settings-section" onSubmit={save}>
        <label className="aw-field">
          <span>name</span>
          <input className="aw-input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="aw-field">
          <span>trigger JSON</span>
          <textarea className="aw-textarea" value={trigger} onChange={(event) => setTrigger(event.target.value)} />
        </label>
        <label className="aw-field">
          <span>instruction</span>
          <textarea
            className="aw-textarea"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
        </label>
        <label className="aw-field">
          <span>repositoryIds JSON</span>
          <textarea
            className="aw-textarea"
            value={repositoryIds}
            onChange={(event) => setRepositoryIds(event.target.value)}
          />
        </label>
        <label className="aw-field">
          <span>agentId</span>
          <select className="aw-select" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            {projectAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.handle} · {agent.status}
              </option>
            ))}
          </select>
        </label>
        <label className="aw-field">
          <span>taskPolicy</span>
          <select
            className="aw-select"
            value={taskPolicy}
            onChange={(event) => setTaskPolicy(event.target.value as Automation['taskPolicy'])}
          >
            <option>create_task</option>
            <option>message_only</option>
          </select>
        </label>
        <label className="aw-field">
          <span>deliveryPolicy</span>
          <select
            className="aw-select"
            value={deliveryPolicy}
            onChange={(event) => setDeliveryPolicy(event.target.value as Automation['deliveryPolicy'])}
          >
            <option>change_set_only</option>
            <option>deliver</option>
          </select>
        </label>
        <label className="aw-field">
          <span>missedRunPolicy</span>
          <select
            className="aw-select"
            value={missedRunPolicy}
            onChange={(event) => setMissedRunPolicy(event.target.value as Automation['missedRunPolicy'])}
          >
            <option>skip</option>
            <option>run_once</option>
            <option>backfill</option>
          </select>
        </label>
        <label className="aw-field aw-field--inline">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          <span>enabled</span>
        </label>
        <div className="aw-toolbar">
          <button className="aw-button aw-button--primary" disabled={!name.trim() || !agentId}>
            保存
          </button>
          {automation && (
            <>
              <button
                className="aw-button"
                type="button"
                onClick={() =>
                  void action(() =>
                    client.runAutomationNow(automation.id, {
                      expectedVersion: automation.version,
                      clientMutationId: createMutationId(),
                    }),
                  )
                }
              >
                Run Now
              </button>
              <button
                className="aw-button aw-button--danger"
                type="button"
                onClick={() => {
                  if (!window.confirm(`Delete Automation ${automation.id}？`)) return;
                  void action(() =>
                    client.deleteAutomation(automation.id, {
                      expectedVersion: automation.version,
                      clientMutationId: createMutationId(),
                    }),
                  );
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </form>
    </details>
  );
}

function RepositoryForm({
  snapshot,
  projectId,
  repository,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  repository?: Repository;
}) {
  const client = useAgentWorkspaceClient();
  const [name, setName] = useState(repository?.name ?? '');
  const [url, setUrl] = useState(repository?.url ?? '');
  const [computerId, setComputerId] = useState(repository?.computerId ?? snapshot.computers[0]?.id ?? '');
  const computer = snapshot.computers.find((item) => item.id === computerId);
  const [registeredRootId, setRegisteredRootId] = useState(
    repository?.registeredRootId ?? computer?.registeredRoots[0]?.id ?? '',
  );
  const [rootAlias, setRootAlias] = useState(repository?.rootAlias ?? '');
  const [relativePath, setRelativePath] = useState(repository?.relativePath ?? '');
  const [defaultBranch, setDefaultBranch] = useState(repository?.defaultBranch ?? '');
  const [notice, setNotice] = useState<string | null>(null);

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
    const common = { name, url, computerId, registeredRootId, rootAlias, relativePath, defaultBranch };
    if (repository) {
      void action(() =>
        client.updateRepository(repository.id, {
          ...common,
          expectedVersion: repository.version,
          clientMutationId: createMutationId(),
        }),
      );
    } else {
      void action(() =>
        client.createRepository({
          projectId,
          ...common,
          clientMutationId: createMutationId(),
        }),
      );
    }
  };

  return (
    <details className="aw-card">
      <summary>{repository ? `编辑 ${repository.name}` : '注册 Repository'}</summary>
      <form className="aw-settings-section" onSubmit={save}>
        <ActionNotice message={notice} />
        {[
          ['name', name, setName],
          ['url', url, setUrl],
          ['rootAlias', rootAlias, setRootAlias],
          ['relativePath', relativePath, setRelativePath],
          ['defaultBranch', defaultBranch, setDefaultBranch],
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
          <select
            className="aw-select"
            value={computerId}
            onChange={(event) => {
              setComputerId(event.target.value);
              setRegisteredRootId('');
            }}
          >
            {snapshot.computers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.status}
              </option>
            ))}
          </select>
        </label>
        <label className="aw-field">
          <span>registeredRootId</span>
          <select
            className="aw-select"
            value={registeredRootId}
            onChange={(event) => setRegisteredRootId(event.target.value)}
          >
            <option value="">null</option>
            {computer?.registeredRoots.map((root) => (
              <option key={root.id} value={root.id}>
                {root.alias} · {root.path} · {String(root.writable)}
              </option>
            ))}
          </select>
        </label>
        <div className="aw-toolbar">
          <button
            className="aw-button aw-button--primary"
            disabled={!name.trim() || !url.trim() || !computerId || !registeredRootId}
          >
            保存
          </button>
          {repository && (
            <>
              <button
                className="aw-button"
                type="button"
                onClick={() =>
                  void action(() =>
                    client.refreshRepository(repository.id, {
                      expectedVersion: repository.version,
                      clientMutationId: createMutationId(),
                    }),
                  )
                }
              >
                Refresh
              </button>
              <button
                className="aw-button aw-button--danger"
                type="button"
                onClick={() => {
                  if (!window.confirm(`Remove Repository ${repository.id}？`)) return;
                  void action(() =>
                    client.removeRepository(repository.id, {
                      expectedVersion: repository.version,
                      clientMutationId: createMutationId(),
                    }),
                  );
                }}
              >
                Remove
              </button>
            </>
          )}
        </div>
      </form>
    </details>
  );
}

export function ProjectRepositoriesPage({ snapshot, projectId }: { snapshot: WorkspaceBootstrap; projectId: string }) {
  const overviewQuery = useProjectOverview(projectId);
  if (overviewQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError)
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  const project = overviewQuery.data.project;
  const repositories = overviewQuery.data.repositories;

  return (
    <section className="aw-page">
      <PageHeader title={`${project.name} / Repositories`} subtitle={`${repositories.length} repositories`} />
      <ProjectTabs projectId={projectId} />
      <RepositoryForm snapshot={snapshot} projectId={projectId} />
      {repositories.length === 0 ? (
        <EmptyState title="暂无 Repository" />
      ) : (
        <div className="aw-repo-list">
          {repositories.map((repository) => {
            const runner = snapshot.computers.find((computer) => computer.id === repository.computerId);
            return (
              <article className="aw-repo-card" key={repository.id}>
                <div className="aw-card-header">
                  <h2>{repository.name}</h2>
                  <Status value={String(repository.dirty)} />
                </div>
                <KeyValue
                  entries={[
                    { label: 'id', value: repository.id },
                    { label: 'url', value: repository.url },
                    { label: 'rootAlias', value: repository.rootAlias },
                    { label: 'path', value: repository.path },
                    { label: 'defaultBranch', value: repository.defaultBranch },
                    { label: 'headSha', value: repository.headSha },
                    { label: 'dirty', value: repository.dirty },
                    { label: 'computerId', value: repository.computerId, node: runner?.name },
                    { label: 'lastSyncResult', value: repository.lastSyncResult },
                    { label: 'updatedAt', value: repository.updatedAt },
                  ]}
                />
                <RepositoryForm snapshot={snapshot} projectId={projectId} repository={repository} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function ProjectMemoryPage({ snapshot, projectId }: { snapshot: WorkspaceBootstrap; projectId: string }) {
  const client = useAgentWorkspaceClient();
  const overviewQuery = useProjectOverview(projectId);
  const [cursor, setCursor] = useState<string | undefined>();
  const memoriesQuery = useMemories(projectId, { cursor, limit: 50 });
  const project = overviewQuery.data?.project;
  const memories = memoriesQuery.data?.items ?? [];
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<'project' | 'agent'>('project');
  const [agentId, setAgentId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  if (overviewQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError)
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  if (!project) return <EmptyState title="Project 不存在" detail={projectId} />;

  const action = async (operation: () => Promise<unknown>) => {
    setNotice(null);
    try {
      await operation();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  const add = async () => {
    if (!content.trim()) return;
    if (scope === 'agent' && !agentId) {
      setNotice('agentId: null');
      return;
    }
    const input =
      scope === 'project'
        ? {
            projectId,
            agentId: null,
            scope,
            content,
            clientMutationId: createMutationId(),
          }
        : {
            projectId,
            agentId,
            scope,
            content,
            clientMutationId: createMutationId(),
          };
    const added = await action(() => client.addMemory(input));
    if (added) setContent('');
  };

  return (
    <section className="aw-page">
      <PageHeader title={`${project.name} / Memory`} subtitle={`${memories.length} entries`} />
      <ProjectTabs projectId={projectId} />
      <ActionNotice message={notice} />
      <div className="aw-card">
        <h2>新增 Memory</h2>
        <label className="aw-field">
          <span>scope</span>
          <select
            className="aw-select"
            value={scope}
            onChange={(event) => setScope(event.target.value as 'project' | 'agent')}
          >
            <option>project</option>
            <option>agent</option>
          </select>
        </label>
        {scope === 'agent' && (
          <label className="aw-field">
            <span>agentId</span>
            <select className="aw-select" value={agentId} onChange={(event) => setAgentId(event.target.value)}>
              <option value="">null</option>
              {snapshot.agents
                .filter((agent) => project.agentIds.includes(agent.id))
                .map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.handle}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="aw-field">
          <span>content</span>
          <textarea
            className="aw-textarea"
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        </label>
        <button className="aw-button aw-button--primary" disabled={!content.trim()} onClick={() => void add()}>
          添加
        </button>
      </div>
      {memoriesQuery.isPending ? (
        <LoadingState />
      ) : memoriesQuery.isError ? (
        <ErrorState error={memoriesQuery.error} retry={() => void memoriesQuery.refetch()} />
      ) : memories.length === 0 ? (
        <EmptyState title="暂无 Memory" />
      ) : (
        <div className="aw-memory-list">
          {memories.map((memory) => {
            const agent = snapshot.agents.find((item) => item.id === memory.agentId);
            return (
              <article className="aw-memory-item" key={memory.id}>
                <div className="aw-card-header">
                  <span className="aw-badge">{memory.scope}</span>
                  <span>pinned: {String(memory.pinned)}</span>
                </div>
                <p>{memory.content}</p>
                <KeyValue
                  entries={[
                    { label: 'id', value: memory.id },
                    { label: 'agentId', value: memory.agentId, node: agent?.handle },
                    { label: 'provenanceType', value: memory.provenanceType },
                    { label: 'provenanceId', value: memory.provenanceId },
                    { label: 'confidence', value: memory.confidence },
                    { label: 'expiresAt', value: memory.expiresAt },
                    { label: 'createdAt', value: memory.createdAt },
                  ]}
                />
                <div className="aw-card-footer">
                  <button
                    className="aw-button aw-button--ghost"
                    onClick={() =>
                      void action(() =>
                        client.setMemoryPinned(memory.id, {
                          pinned: !memory.pinned,
                          expectedVersion: memory.version,
                          clientMutationId: createMutationId(),
                        }),
                      )
                    }
                  >
                    Toggle pinned
                  </button>
                  <button
                    className="aw-button aw-button--danger"
                    onClick={() => {
                      if (window.confirm(`删除 Memory ${memory.id}？`)) {
                        void action(() =>
                          client.deleteMemory(memory.id, {
                            expectedVersion: memory.version,
                            clientMutationId: createMutationId(),
                          }),
                        );
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {memoriesQuery.data && <CursorPager page={memoriesQuery.data} onCursor={setCursor} />}
    </section>
  );
}

export function ProjectAutomationsPage({ snapshot, projectId }: { snapshot: WorkspaceBootstrap; projectId: string }) {
  const client = useAgentWorkspaceClient();
  const overviewQuery = useProjectOverview(projectId);
  const [cursor, setCursor] = useState<string | undefined>();
  const automationsQuery = useAutomations(projectId, { cursor, limit: 50 });
  const project = overviewQuery.data?.project;
  const automations = automationsQuery.data?.items ?? [];
  const [notice, setNotice] = useState<string | null>(null);
  if (overviewQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError)
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  if (!project) return <EmptyState title="Project 不存在" detail={projectId} />;

  const toggle = async (id: string) => {
    setNotice(null);
    try {
      const automation = automations.find((item) => item.id === id);
      if (!automation) return;
      await client.setAutomationEnabled(id, {
        enabled: !automation.enabled,
        expectedVersion: automation.version,
        clientMutationId: createMutationId(),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader title={`${project.name} / Automations`} subtitle={`${automations.length} automations`} />
      <ProjectTabs projectId={projectId} />
      <ActionNotice message={notice} />
      <AutomationForm snapshot={snapshot} projectId={projectId} onNotice={setNotice} />
      {automationsQuery.isPending ? (
        <LoadingState />
      ) : automationsQuery.isError ? (
        <ErrorState error={automationsQuery.error} retry={() => void automationsQuery.refetch()} />
      ) : automations.length === 0 ? (
        <EmptyState title="暂无 Automation" />
      ) : (
        <div className="aw-automation-list">
          {automations.map((automation) => {
            const agent = snapshot.agents.find((item) => item.id === automation.agentId);
            return (
              <article className="aw-automation-item" key={automation.id}>
                <div className="aw-card-header">
                  <div>
                    <h2>{automation.name}</h2>
                    <span className="aw-badge">{automation.trigger.type}</span>
                  </div>
                  <Status value={String(automation.enabled)} />
                </div>
                <KeyValue
                  entries={[
                    { label: 'id', value: automation.id },
                    { label: 'agentId', value: automation.agentId, node: agent?.handle },
                    { label: 'missedRunPolicy', value: automation.missedRunPolicy },
                    { label: 'lastRunAt', value: automation.lastRunAt },
                    { label: 'nextRunAt', value: automation.nextRunAt },
                    { label: 'lastResult', value: automation.lastResult },
                  ]}
                />
                <h3>trigger</h3>
                <RawValue value={automation.trigger} />
                <h3>instruction</h3>
                <RawValue value={automation.instruction} />
                <h3>repositoryIds</h3>
                <RawValue value={automation.repositoryIds} />
                <KeyValue
                  entries={[
                    { label: 'taskPolicy', value: automation.taskPolicy },
                    { label: 'deliveryPolicy', value: automation.deliveryPolicy },
                  ]}
                />
                <button className="aw-button" onClick={() => void toggle(automation.id)}>
                  Toggle enabled
                </button>
                <AutomationForm
                  snapshot={snapshot}
                  projectId={projectId}
                  automation={automation}
                  onNotice={setNotice}
                />
              </article>
            );
          })}
        </div>
      )}
      {automationsQuery.data && <CursorPager page={automationsQuery.data} onCursor={setCursor} />}
    </section>
  );
}
