import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Project, WorkspaceBootstrap } from '../domain';
import { useAgentWorkspaceClient } from '../data/context';
import { ActionNotice, EmptyState, KeyValue, PageHeader, Status } from '../components/Primitives';
import { workspacePath } from '../components/paths';
import { createMutationId } from '../components/mutations';

function ProjectEditor({ project, snapshot }: { project: Project; snapshot: WorkspaceBootstrap }) {
  const client = useAgentWorkspaceClient();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [defaultAgentId, setDefaultAgentId] = useState(project.defaultAgentId ?? '');
  const [notice, setNotice] = useState<string | null>(null);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    try {
      await client.updateProject(project.id, {
        name,
        description: description || null,
        defaultAgentId: defaultAgentId || null,
        expectedVersion: project.version,
        clientMutationId: createMutationId(),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <details>
      <summary>编辑 Project</summary>
      <form className="aw-settings-section" onSubmit={save}>
        <ActionNotice message={notice} />
        <label className="aw-field">
          <span>name</span>
          <input className="aw-input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="aw-field">
          <span>description</span>
          <textarea
            className="aw-textarea"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <label className="aw-field">
          <span>defaultAgentId</span>
          <select
            className="aw-select"
            value={defaultAgentId}
            onChange={(event) => setDefaultAgentId(event.target.value)}
          >
            <option value="">null</option>
            {snapshot.agents
              .filter((agent) => agent.projectId === project.id)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.handle}
                </option>
              ))}
          </select>
        </label>
        <div className="aw-toolbar">
          <button className="aw-button aw-button--primary" disabled={!name.trim()}>
            保存
          </button>
          {project.status !== 'archived' && (
            <button
              className="aw-button aw-button--danger"
              type="button"
              onClick={() => {
                if (!window.confirm(`Archive Project ${project.id}？`)) return;
                void client
                  .archiveProject(project.id, {
                    expectedVersion: project.version,
                    clientMutationId: createMutationId(),
                  })
                  .catch((error) => setNotice(error instanceof Error ? error.message : String(error)));
              }}
            >
              Archive
            </button>
          )}
        </div>
      </form>
    </details>
  );
}

export function ProjectsPage({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  const client = useAgentWorkspaceClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const createProject = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    try {
      await client.createProject({
        name,
        description: description || null,
        clientMutationId: createMutationId(),
      });
      setName('');
      setDescription('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader title="Projects" subtitle={`${snapshot.projects.length} projects`} />
      <details className="aw-card">
        <summary>新建 Project</summary>
        <form className="aw-settings-section" onSubmit={createProject}>
          <ActionNotice message={notice} />
          <label className="aw-field">
            <span>name</span>
            <input className="aw-input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="aw-field">
            <span>description</span>
            <textarea
              className="aw-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button className="aw-button aw-button--primary" disabled={!name.trim()}>
            创建
          </button>
        </form>
      </details>
      {snapshot.projects.length === 0 ? (
        <EmptyState title="暂无 Project" detail="创建 Project 后，聊天、任务、运行和多仓库交付会在同一上下文中组织。" />
      ) : (
        <div className="aw-grid">
          {snapshot.projects.map((project) => {
            const repositories = snapshot.repositories.filter((repository) =>
              project.repositoryIds.includes(repository.id),
            );
            const agents = snapshot.agents.filter((agent) => project.agentIds.includes(agent.id));
            return (
              <article className="aw-card" key={project.id}>
                <div className="aw-card-header">
                  <div>
                    <h2 className="aw-card-title">
                      <Link className="aw-link" to={workspacePath(`/projects/${project.id}/chat`)}>
                        {project.name}
                      </Link>
                    </h2>
                    {project.description !== null && <p>{project.description}</p>}
                  </div>
                  <Status value={project.status} />
                </div>
                <KeyValue
                  entries={[
                    { label: 'id', value: project.id },
                    { label: 'taskCount', value: project.taskCount },
                    { label: 'runningRunCount', value: project.runningRunCount },
                    { label: 'defaultAgentId', value: project.defaultAgentId },
                    { label: 'createdAt', value: project.createdAt },
                    { label: 'updatedAt', value: project.updatedAt },
                  ]}
                />
                <div className="aw-card-body">
                  <h3>Repositories</h3>
                  {repositories.map((repository) => (
                    <span className="aw-badge" key={repository.id}>
                      {repository.name}
                    </span>
                  ))}
                  <h3>Agents</h3>
                  {agents.map((agent) => (
                    <span className="aw-badge" key={agent.id}>
                      {agent.handle} · {agent.runtime}
                    </span>
                  ))}
                </div>
                <div className="aw-card-footer">
                  <Link className="aw-button aw-button--primary" to={workspacePath(`/projects/${project.id}/chat`)}>
                    打开 Project
                  </Link>
                  <Link className="aw-button aw-button--ghost" to={workspacePath(`/projects/${project.id}/tasks`)}>
                    Tasks
                  </Link>
                </div>
                <ProjectEditor project={project} snapshot={snapshot} />
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
