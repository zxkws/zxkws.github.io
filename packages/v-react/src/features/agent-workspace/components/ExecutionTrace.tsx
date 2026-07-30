import { Link } from 'react-router-dom';
import type { ChangeSet, ContextSnapshot, Delivery, Run, WorkspaceBootstrap } from '../domain';
import { RawValue, Status } from './Primitives';
import { workspacePath } from './paths';

export function ExecutionTrace({
  snapshot,
  projectId,
  run,
  contextSnapshot,
  changeSet,
  delivery,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  run?: Run | null;
  contextSnapshot?: ContextSnapshot | null;
  changeSet?: ChangeSet | null;
  delivery?: Delivery | null;
}) {
  const taskId = run?.taskId ?? contextSnapshot?.taskId ?? null;

  return (
    <nav className="aw-trace" aria-label="执行链路">
      <Link className="aw-trace-node" to={workspacePath(`/projects/${projectId}/chat`)}>
        <small>Project</small>
        <span>{snapshot.projects.find((project) => project.id === projectId)?.name ?? projectId}</span>
      </Link>
      <span className="aw-trace-arrow" aria-hidden="true">
        →
      </span>
      <Link
        className="aw-trace-node"
        to={
          taskId
            ? workspacePath(`/projects/${projectId}/tasks/${taskId}`)
            : workspacePath(`/projects/${projectId}/chat`)
        }
      >
        <small>{taskId ? 'Task' : 'Message'}</small>
        <span>{taskId ?? contextSnapshot?.triggerMessageId ?? run?.triggerMessageId ?? 'null'}</span>
      </Link>
      <span className="aw-trace-arrow" aria-hidden="true">
        →
      </span>
      <div className="aw-trace-node">
        <small>ContextSnapshot</small>
        <RawValue value={contextSnapshot?.id ?? null} />
      </div>
      <span className="aw-trace-arrow" aria-hidden="true">
        →
      </span>
      {run ? (
        <Link className="aw-trace-node" to={workspacePath(`/projects/${projectId}/runs/${run.id}`)}>
          <small>Run</small>
          <Status value={run.status} />
        </Link>
      ) : (
        <div className="aw-trace-node">
          <small>Run</small>
          <RawValue value={null} />
        </div>
      )}
      <span className="aw-trace-arrow" aria-hidden="true">
        →
      </span>
      {changeSet ? (
        <Link className="aw-trace-node" to={workspacePath(`/projects/${projectId}/changes/${changeSet.id}`)}>
          <small>ChangeSet</small>
          <Status value={changeSet.status} />
        </Link>
      ) : (
        <div className="aw-trace-node">
          <small>ChangeSet</small>
          <RawValue value={null} />
        </div>
      )}
      <span className="aw-trace-arrow" aria-hidden="true">
        →
      </span>
      {delivery ? (
        <Link className="aw-trace-node" to={workspacePath(`/deliveries/${delivery.id}`)}>
          <small>Delivery</small>
          <Status value={delivery.status} />
        </Link>
      ) : (
        <div className="aw-trace-node">
          <small>Delivery</small>
          <RawValue value={null} />
        </div>
      )}
    </nav>
  );
}
