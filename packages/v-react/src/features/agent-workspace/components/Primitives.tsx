import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { WorkspaceBootstrap } from '../domain';
import { workspacePath } from './paths';

export function RawValue({ value }: { value: unknown }) {
  if (typeof value === 'string') return <span className="aw-raw">{value}</span>;
  if (value === undefined) return <span className="aw-raw">undefined</span>;
  if (typeof value === 'object' && value !== null) {
    return <pre className="aw-raw">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <span className="aw-raw">{String(value)}</span>;
}

export function Status({ value }: { value: string }) {
  return (
    <span className="aw-status" data-status={value}>
      {value}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="aw-page-header">
      <div className="aw-page-heading">
        <h1 className="aw-page-title">{title}</h1>
        {subtitle !== undefined && <div className="aw-page-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="aw-page-actions">{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <section className="aw-empty">
      <h2>{title}</h2>
      {detail && <p>{detail}</p>}
    </section>
  );
}

export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <section className="aw-error" role="alert">
      <h2>请求失败</h2>
      <RawValue value={message} />
      {retry && (
        <button className="aw-button" type="button" onClick={retry}>
          重试
        </button>
      )}
    </section>
  );
}

export function LoadingState() {
  return (
    <section className="aw-loading" aria-live="polite" aria-busy="true">
      正在加载…
    </section>
  );
}

export function KeyValue({ entries }: { entries: Array<{ label: string; value: unknown; node?: ReactNode }> }) {
  return (
    <dl className="aw-kv">
      {entries.map((entry) => (
        <div className="aw-kv-row" key={entry.label}>
          <dt>{entry.label}</dt>
          <dd>{entry.node ?? <RawValue value={entry.value} />}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AgentAvatar({ name }: { name: string }) {
  return (
    <span className="aw-avatar" aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}

export function EntityLink({
  snapshot: _snapshot,
  entityType,
  entityId,
  projectId,
  children,
}: {
  snapshot: WorkspaceBootstrap;
  entityType: string;
  entityId: string;
  projectId?: string | null;
  children: ReactNode;
}) {
  let target: string | null = null;
  if (entityType === 'task' && projectId) target = workspacePath(`/projects/${projectId}/tasks/${entityId}`);
  if (entityType === 'run' && projectId) target = workspacePath(`/projects/${projectId}/runs/${entityId}`);
  if ((entityType === 'delivery' || entityType === 'change_set') && projectId) {
    target =
      entityType === 'change_set'
        ? workspacePath(`/projects/${projectId}/changes/${entityId}`)
        : workspacePath(`/deliveries/${entityId}`);
  }
  if (entityType === 'computer') target = workspacePath(`/computers/${entityId}`);
  if (entityType === 'agent') target = workspacePath(`/agents/${entityId}`);
  if (entityType === 'project') target = workspacePath(`/projects/${entityId}/chat`);
  if (entityType === 'message' && projectId) target = workspacePath(`/projects/${projectId}/chat`);
  if (entityType === 'repository' && projectId) target = workspacePath(`/projects/${projectId}/repositories`);
  if (entityType === 'memory' && projectId) target = workspacePath(`/projects/${projectId}/memory`);

  return target ? (
    <Link className="aw-link" to={target}>
      {children}
    </Link>
  ) : (
    <span>{children}</span>
  );
}

export function ActionNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="aw-banner" role="status" aria-live="polite">
      {message}
    </div>
  );
}
