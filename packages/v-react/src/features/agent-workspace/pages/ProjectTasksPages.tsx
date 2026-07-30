import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Project, Task, TaskDetail, TaskStatus, WorkspaceBootstrap } from '../domain';
import { useAgentWorkspaceClient, useProjectOverview, useTask, useTasks } from '../data/context';
import {
  ActionNotice,
  EmptyState,
  ErrorState,
  KeyValue,
  LoadingState,
  PageHeader,
  Status,
} from '../components/Primitives';
import { ProjectTabs } from '../components/WorkspaceLayout';
import { workspacePath } from '../components/paths';
import { createMutationId, receiptEntityId } from '../components/mutations';
import { CursorPager } from '../components/CursorPager';

const taskStatuses: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'];

function TaskCard({
  task,
  snapshot,
  onStatus,
}: {
  task: Task;
  snapshot: WorkspaceBootstrap;
  onStatus: (task: Task, status: TaskStatus) => void;
}) {
  const agent = snapshot.agents.find((item) => item.id === task.assignedAgentId);
  return (
    <article className="aw-task-card" data-status={task.status}>
      <div className="aw-card-header">
        <Link className="aw-card-title aw-link" to={workspacePath(`/projects/${task.projectId}/tasks/${task.id}`)}>
          {task.title}
        </Link>
        <Status value={task.status} />
      </div>
      {task.description !== null && <p>{task.description}</p>}
      <div className="aw-meta">
        <span>{task.priority}</span>
        <span>{agent?.handle ?? String(task.assignedAgentId)}</span>
        <span>{task.updatedAt}</span>
      </div>
      {task.blockingReason !== null && <div className="aw-banner aw-banner--warning">{task.blockingReason}</div>}
      <label className="aw-field">
        <span>status</span>
        <select
          className="aw-select"
          value={task.status}
          onChange={(event) => onStatus(task, event.target.value as TaskStatus)}
        >
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
    </article>
  );
}

export function ProjectTasksPage({ snapshot, projectId }: { snapshot: WorkspaceBootstrap; projectId: string }) {
  const client = useAgentWorkspaceClient();
  const overviewQuery = useProjectOverview(projectId);
  const [cursor, setCursor] = useState<string | undefined>();
  const tasksQuery = useTasks(projectId, { cursor, limit: 50 });
  const project = overviewQuery.data?.project;
  const tasks = tasksQuery.data?.items ?? [];
  const [view, setView] = useState<'board' | 'list'>('board');
  const [notice, setNotice] = useState<string | null>(null);

  if (overviewQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError)
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  if (!project) return <EmptyState title="Project 不存在" detail={projectId} />;

  const updateStatus = async (task: Task, status: TaskStatus) => {
    setNotice(null);
    try {
      await client.updateTask(task.id, {
        status,
        expectedVersion: task.version,
        clientMutationId: createMutationId(),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader
        title={`${project.name} / Tasks`}
        subtitle={`${tasks.length} tasks`}
        actions={
          <div className="aw-tabs">
            <button className={`aw-tab${view === 'board' ? ' aw-tab--active' : ''}`} onClick={() => setView('board')}>
              Board
            </button>
            <button className={`aw-tab${view === 'list' ? ' aw-tab--active' : ''}`} onClick={() => setView('list')}>
              List
            </button>
          </div>
        }
      />
      <ProjectTabs projectId={projectId} />
      <ActionNotice message={notice} />
      {tasksQuery.isPending ? (
        <LoadingState />
      ) : tasksQuery.isError ? (
        <ErrorState error={tasksQuery.error} retry={() => void tasksQuery.refetch()} />
      ) : tasks.length === 0 ? (
        <EmptyState title="暂无 Task" detail="可以在 Project Chat 中将消息转换为 Task。" />
      ) : view === 'board' ? (
        <div className="aw-task-board">
          {taskStatuses.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);
            return (
              <section className="aw-task-column" key={status}>
                <header className="aw-task-column-header">
                  <Status value={status} />
                  <span>{columnTasks.length}</span>
                </header>
                <div className="aw-task-list">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      snapshot={snapshot}
                      onStatus={(item, value) => void updateStatus(item, value)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="aw-task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              snapshot={snapshot}
              onStatus={(item, value) => void updateStatus(item, value)}
            />
          ))}
        </div>
      )}
      {tasksQuery.data && <CursorPager page={tasksQuery.data} onCursor={setCursor} />}
    </section>
  );
}

export function TaskDetailPage({
  snapshot,
  projectId,
  taskId,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  taskId: string;
}) {
  const overviewQuery = useProjectOverview(projectId);
  const taskQuery = useTask(taskId);
  if (overviewQuery.isPending || taskQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError)
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  if (taskQuery.isError) return <ErrorState error={taskQuery.error} retry={() => void taskQuery.refetch()} />;
  return (
    <TaskDetailContent
      snapshot={snapshot}
      projectId={projectId}
      detail={taskQuery.data}
      project={overviewQuery.data.project}
    />
  );
}

function TaskDetailContent({
  snapshot,
  projectId,
  detail,
  project,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  detail: TaskDetail;
  project: Project;
}) {
  const client = useAgentWorkspaceClient();
  const navigate = useNavigate();
  const task = detail.task;
  const [selectedAgentId, setSelectedAgentId] = useState(task.assignedAgentId ?? project.defaultAgentId ?? '');
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const assignedAgent = snapshot.agents.find((agent) => agent.id === task.assignedAgentId);
  const parent = detail.relatedTasks.find((item) => item.id === task.parentId);
  const dependencies = detail.relatedTasks.filter((item) => task.dependencyIds.includes(item.id));
  const childTasks = detail.relatedTasks.filter((item) => item.parentId === task.id);
  const message = detail.triggerMessage;
  const runs = detail.runs;
  const threadMessages = detail.threadMessages.items;

  const updateStatus = async (status: TaskStatus) => {
    setNotice(null);
    try {
      await client.updateTask(task.id, {
        status,
        expectedVersion: task.version,
        clientMutationId: createMutationId(),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const startRun = async () => {
    if (!selectedAgentId) {
      setNotice('agentId: null');
      return;
    }
    setNotice(null);
    try {
      const receipt = await client.startRun({
        projectId,
        taskId: task.id,
        agentId: selectedAgentId,
        triggerMessageId: task.messageId,
        clientMutationId: createMutationId(),
      });
      const runId = receiptEntityId(receipt);
      navigate(workspacePath(`/projects/${projectId}/runs/${runId}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader
        title={task.title}
        subtitle={task.id}
        actions={
          <>
            <button className="aw-button aw-button--ghost" onClick={() => setInspectorOpen(true)}>
              Details
            </button>
            <Link className="aw-button aw-button--ghost" to={workspacePath(`/projects/${projectId}/tasks`)}>
              返回 Tasks
            </Link>
          </>
        }
      />
      <ProjectTabs projectId={projectId} />
      <ActionNotice message={notice} />
      <div className="aw-task-layout">
        <article className="aw-task-detail">
          <div className="aw-card-header">
            <Status value={task.status} />
            <Status value={task.priority} />
          </div>
          {task.description !== null && <p>{task.description}</p>}
          <KeyValue
            entries={[
              { label: 'assignedAgentId', value: task.assignedAgentId, node: assignedAgent?.handle },
              { label: 'parentId', value: task.parentId, node: parent?.title },
              { label: 'blockingReason', value: task.blockingReason },
              { label: 'currentRunId', value: task.currentRunId },
              { label: 'deliveryId', value: task.deliveryId },
              { label: 'createdAt', value: task.createdAt },
              { label: 'updatedAt', value: task.updatedAt },
            ]}
          />
          <h3>Acceptance Criteria</h3>
          {task.acceptanceCriteria.length === 0 ? (
            <span>null</span>
          ) : (
            <ul>
              {task.acceptanceCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          )}
          <h3>Dependencies</h3>
          {dependencies.map((dependency) => (
            <Link
              className="aw-badge"
              key={dependency.id}
              to={workspacePath(`/projects/${projectId}/tasks/${dependency.id}`)}
            >
              {dependency.title} · {dependency.status}
            </Link>
          ))}
          <h3>Subtasks</h3>
          {childTasks.map((child) => (
            <Link className="aw-badge" key={child.id} to={workspacePath(`/projects/${projectId}/tasks/${child.id}`)}>
              {child.title} · {child.status}
            </Link>
          ))}
          <div className="aw-toolbar">
            <label className="aw-field">
              <span>status</span>
              <select
                className="aw-select"
                value={task.status}
                onChange={(event) => void updateStatus(event.target.value as TaskStatus)}
              >
                {taskStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="aw-field">
              <span>Agent</span>
              <select
                className="aw-select"
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
              >
                <option value="">null</option>
                {snapshot.agents
                  .filter((agent) => project.agentIds.includes(agent.id))
                  .map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.handle} · {agent.runtime} · {agent.status}
                    </option>
                  ))}
              </select>
            </label>
            <button className="aw-button aw-button--primary" onClick={() => void startRun()}>
              启动 Run
            </button>
          </div>
        </article>

        {inspectorOpen && (
          <button className="aw-inspector-backdrop" aria-label="关闭详情" onClick={() => setInspectorOpen(false)} />
        )}
        <aside className="aw-inspector" data-open={String(inspectorOpen)}>
          <button className="aw-icon-button aw-inspector-close" onClick={() => setInspectorOpen(false)}>
            关闭
          </button>
          <h2>Trigger Message</h2>
          <p>{message?.content ?? String(message)}</p>
          <h2>Runs</h2>
          {runs.length === 0 ? (
            <span>null</span>
          ) : (
            runs.map((run) => (
              <Link className="aw-list-item" key={run.id} to={workspacePath(`/projects/${projectId}/runs/${run.id}`)}>
                <span>{run.id}</span>
                <Status value={run.status} />
              </Link>
            ))
          )}
          <h2>Task Thread</h2>
          {threadMessages.map((threadMessage) => (
            <article className="aw-message" key={threadMessage.id}>
              <span className="aw-message-author">{threadMessage.actorType}</span>
              <p className="aw-message-body">{threadMessage.content}</p>
              <span className="aw-message-meta">{threadMessage.createdAt}</span>
            </article>
          ))}
        </aside>
      </div>
    </section>
  );
}
