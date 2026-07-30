import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WorkspaceBootstrap } from '../domain';
import { useActivity, useAgentWorkspaceClient, useInbox } from '../data/context';
import {
  ActionNotice,
  EmptyState,
  EntityLink,
  ErrorState,
  LoadingState,
  PageHeader,
  Status,
} from '../components/Primitives';
import { workspacePath } from '../components/paths';
import { createMutationId } from '../components/mutations';
import { CursorPager } from '../components/CursorPager';

export function InboxPage({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  const client = useAgentWorkspaceClient();
  const [filter, setFilter] = useState('all');
  const [cursor, setCursor] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const inboxQuery = useInbox({ cursor, limit: 50 });
  const items = inboxQuery.data?.items ?? [];
  const types = Array.from(new Set(items.map((item) => item.type)));
  const visibleItems = filter === 'all' ? items : items.filter((item) => item.type === filter);

  const run = async (action: () => Promise<unknown>) => {
    setNotice(null);
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader
        title="Inbox"
        subtitle={`${items.filter((item) => !item.read).length} unread`}
        actions={
          <button
            className="aw-button"
            type="button"
            onClick={() => void run(() => client.markAllInboxRead({ clientMutationId: createMutationId() }))}
          >
            全部标记已读
          </button>
        }
      />
      <div className="aw-tabs" role="tablist" aria-label="Inbox 视图">
        <span className="aw-tab aw-tab--active">需要处理</span>
        <Link className="aw-tab" to={workspacePath('/inbox/activity')}>
          Activity
        </Link>
      </div>
      <div className="aw-toolbar">
        <label className="aw-field">
          <span>type</span>
          <select className="aw-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">all</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ActionNotice message={notice} />
      {inboxQuery.isPending ? (
        <LoadingState />
      ) : inboxQuery.isError ? (
        <ErrorState error={inboxQuery.error} retry={() => void inboxQuery.refetch()} />
      ) : visibleItems.length === 0 ? (
        <EmptyState title="Inbox 为空" detail="需要输入、失败、中断及离线事件会显示在这里。" />
      ) : (
        <div className="aw-inbox-list">
          {visibleItems.map((item) => (
            <article className="aw-inbox-item" key={item.id} data-status={item.status}>
              <div className="aw-card-header">
                <div>
                  <span className="aw-badge">{item.type}</span>
                  <h2 className="aw-card-title">
                    <EntityLink
                      snapshot={snapshot}
                      entityType={item.entityType}
                      entityId={item.entityId}
                      projectId={item.projectId}
                    >
                      {item.title}
                    </EntityLink>
                  </h2>
                </div>
                <Status value={item.status} />
              </div>
              {item.detail !== null && <p>{item.detail}</p>}
              <div className="aw-meta">
                <span>{item.entityType}</span>
                <span>{item.entityId}</span>
                <span>{item.createdAt}</span>
                <span>read: {String(item.read)}</span>
              </div>
              {!item.read && (
                <button
                  className="aw-button aw-button--ghost"
                  onClick={() =>
                    void run(() =>
                      client.markInboxRead(item.id, {
                        expectedVersion: item.version,
                        clientMutationId: createMutationId(),
                      }),
                    )
                  }
                >
                  标记已读
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {inboxQuery.data && <CursorPager page={inboxQuery.data} onCursor={setCursor} />}
    </section>
  );
}

export function ActivityPage({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  const [cursor, setCursor] = useState<string | undefined>();
  const activityQuery = useActivity({ cursor, limit: 50 });
  const activities = activityQuery.data?.items ?? [];
  return (
    <section className="aw-page">
      <PageHeader title="Activity" subtitle={`${activities.length} events`} />
      <div className="aw-tabs" role="tablist" aria-label="Inbox 视图">
        <Link className="aw-tab" to={workspacePath('/inbox')}>
          需要处理
        </Link>
        <span className="aw-tab aw-tab--active">Activity</span>
      </div>
      {activityQuery.isPending ? (
        <LoadingState />
      ) : activityQuery.isError ? (
        <ErrorState error={activityQuery.error} retry={() => void activityQuery.refetch()} />
      ) : activities.length === 0 ? (
        <EmptyState title="暂无 Activity" />
      ) : (
        <div className="aw-activity-list">
          {activities.map((event) => (
            <article className="aw-activity-item" key={event.id}>
              <div className="aw-card-header">
                <span className="aw-badge">{event.type}</span>
                <span>{event.createdAt}</span>
              </div>
              <EntityLink
                snapshot={snapshot}
                entityType={event.entityType}
                entityId={event.entityId}
                projectId={event.projectId}
              >
                {event.message ?? event.entityId}
              </EntityLink>
              <div className="aw-meta">
                <span>{event.actorType}</span>
                <span>{String(event.actorId)}</span>
                <span>{event.entityType}</span>
                <span>{event.entityId}</span>
              </div>
            </article>
          ))}
        </div>
      )}
      {activityQuery.data && <CursorPager page={activityQuery.data} onCursor={setCursor} />}
    </section>
  );
}
