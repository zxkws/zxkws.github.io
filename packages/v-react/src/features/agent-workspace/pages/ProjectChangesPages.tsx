import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChangeSetDetail, RunDetail, WorkspaceBootstrap } from '../domain';
import {
  useAgentWorkspaceClient,
  useChangeSet,
  useChangeSets,
  useDelivery,
  useProjectOverview,
  useRun,
} from '../data/context';
import { ArtifactReference } from '../components/ArtifactReference';
import { CursorPager } from '../components/CursorPager';
import { ExecutionTrace } from '../components/ExecutionTrace';
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
import { workspacePath } from '../components/paths';

export function ProjectChangesPage({
  snapshot: _snapshot,
  projectId,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
}) {
  const overviewQuery = useProjectOverview(projectId);
  const [cursor, setCursor] = useState<string | undefined>();
  const changeSetsQuery = useChangeSets(projectId, { cursor, limit: 50 });
  if (overviewQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError)
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  const project = overviewQuery.data.project;
  const changeSets = changeSetsQuery.data?.items ?? [];

  return (
    <section className="aw-page">
      <PageHeader title={`${project.name} / Changes`} subtitle={`${changeSets.length} change sets`} />
      <ProjectTabs projectId={projectId} />
      {changeSetsQuery.isPending ? (
        <LoadingState />
      ) : changeSetsQuery.isError ? (
        <ErrorState error={changeSetsQuery.error} retry={() => void changeSetsQuery.refetch()} />
      ) : changeSets.length === 0 ? (
        <EmptyState title="暂无 ChangeSet" />
      ) : (
        <div className="aw-list">
          {changeSets.map((changeSet) => (
            <Link
              className="aw-list-item"
              key={changeSet.id}
              to={workspacePath(`/projects/${projectId}/changes/${changeSet.id}`)}
            >
              <div>
                <strong>{changeSet.summary ?? changeSet.id}</strong>
                <div className="aw-meta">
                  <span>{changeSet.id}</span>
                  <span>{changeSet.runId}</span>
                  <span>{changeSet.createdAt}</span>
                  <span>deliveryId: {String(changeSet.deliveryId)}</span>
                </div>
              </div>
              <Status value={changeSet.status} />
            </Link>
          ))}
        </div>
      )}
      {changeSetsQuery.data && <CursorPager page={changeSetsQuery.data} onCursor={setCursor} />}
    </section>
  );
}

export function DeliveryDetailPage({ snapshot, deliveryId }: { snapshot: WorkspaceBootstrap; deliveryId: string }) {
  const client = useAgentWorkspaceClient();
  const deliveryQuery = useDelivery(deliveryId);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  if (deliveryQuery.isPending) return <LoadingState />;
  if (deliveryQuery.isError) {
    return <ErrorState error={deliveryQuery.error} retry={() => void deliveryQuery.refetch()} />;
  }
  const delivery = deliveryQuery.data;
  const retryableTargets = delivery.targets.filter((target) => ['failed', 'partial'].includes(target.status));

  const action = async (operation: () => Promise<unknown>) => {
    setNotice(null);
    try {
      await operation();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader
        title={`Delivery ${delivery.id}`}
        subtitle={delivery.projectId}
        actions={
          <Link
            className="aw-button aw-button--ghost"
            to={workspacePath(`/projects/${delivery.projectId}/changes/${delivery.changeSetId}`)}
          >
            打开 ChangeSet
          </Link>
        }
      />
      <ProjectTabs projectId={delivery.projectId} />
      <ActionNotice message={notice} />
      <div className="aw-card-header">
        <Status value={delivery.status} />
        <span>{delivery.createdAt}</span>
        <span>{String(delivery.completedAt)}</span>
      </div>
      <div className="aw-delivery">
        {delivery.targets.map((target) => {
          const repository = snapshot.repositories.find((item) => item.id === target.repositoryId);
          const retryable = retryableTargets.some((item) => item.id === target.id);
          return (
            <article className="aw-delivery-step" key={target.id}>
              <div className="aw-card-header">
                {retryable && (
                  <input
                    aria-label={`选择 ${target.id}`}
                    type="checkbox"
                    checked={selectedTargetIds.includes(target.id)}
                    onChange={() =>
                      setSelectedTargetIds((current) =>
                        current.includes(target.id)
                          ? current.filter((item) => item !== target.id)
                          : [...current, target.id],
                      )
                    }
                  />
                )}
                <strong>{repository?.name ?? target.repositoryId}</strong>
                <span>{target.kind}</span>
                <Status value={target.status} />
              </div>
              <KeyValue
                entries={[
                  { label: 'id', value: target.id },
                  { label: 'attempt', value: target.attempt },
                  { label: 'reference', value: target.reference },
                  { label: 'detail', value: target.detail },
                  { label: 'error', value: target.error },
                  { label: 'startedAt', value: target.startedAt },
                  { label: 'completedAt', value: target.completedAt },
                ]}
              />
            </article>
          );
        })}
      </div>
      <div className="aw-toolbar">
        {retryableTargets.length > 0 && (
          <button
            className="aw-button"
            disabled={selectedTargetIds.length === 0}
            onClick={() =>
              void action(() =>
                client.retryDelivery(delivery.id, {
                  targetIds: selectedTargetIds,
                  expectedVersion: delivery.version,
                  clientMutationId: createMutationId(),
                }),
              )
            }
          >
            Retry selected
          </button>
        )}
        {delivery.status === 'outcome_unknown' && (
          <button
            className="aw-button aw-button--primary"
            onClick={() =>
              void action(() =>
                client.reconcileDelivery(delivery.id, {
                  expectedVersion: delivery.version,
                  clientMutationId: createMutationId(),
                }),
              )
            }
          >
            Reconcile
          </button>
        )}
      </div>
    </section>
  );
}

export function ChangeSetDetailPage({
  snapshot,
  projectId,
  changeSetId,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  changeSetId: string;
}) {
  const changeSetQuery = useChangeSet(changeSetId);
  if (changeSetQuery.isPending) return <LoadingState />;
  if (changeSetQuery.isError) {
    return <ErrorState error={changeSetQuery.error} retry={() => void changeSetQuery.refetch()} />;
  }
  if (changeSetQuery.data.changeSet.projectId !== projectId) {
    return <EmptyState title="ChangeSet 不属于当前 Project" detail={changeSetId} />;
  }
  return <ChangeSetWithRun snapshot={snapshot} projectId={projectId} detail={changeSetQuery.data} />;
}

function ChangeSetWithRun({
  snapshot,
  projectId,
  detail,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  detail: ChangeSetDetail;
}) {
  const runQuery = useRun(detail.changeSet.runId);
  if (runQuery.isPending) return <LoadingState />;
  if (runQuery.isError) return <ErrorState error={runQuery.error} retry={() => void runQuery.refetch()} />;
  return <ChangeSetDetailContent snapshot={snapshot} projectId={projectId} detail={detail} runDetail={runQuery.data} />;
}

function ChangeSetActions({ detail }: { detail: ChangeSetDetail }) {
  const client = useAgentWorkspaceClient();
  const changeSet = detail.changeSet;
  const delivery = detail.delivery;
  const [notice, setNotice] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [retryTargetIds, setRetryTargetIds] = useState<string[]>([]);

  const action = async (operation: () => Promise<unknown>) => {
    setNotice(null);
    try {
      await operation();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const targetKey = (repositoryId: string, kind: string) => `${repositoryId}:${kind}`;
  const toggleTarget = (key: string) =>
    setSelectedTargets((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );

  const deliver = () => {
    const targets = selectedTargets.map((key) => {
      const separator = key.lastIndexOf(':');
      const repositoryId = key.slice(0, separator);
      const kind = key.slice(separator + 1) as 'commit' | 'push' | 'pull_request' | 'deploy';
      const repositoryChange = changeSet.repositoryChanges.find((item) => item.repositoryId === repositoryId);
      return {
        repositoryId,
        kind,
        branch: repositoryChange?.branch ?? null,
        title: changeSet.summary,
        description: null,
        options: {},
      };
    });
    void action(() =>
      client.createDelivery({
        changeSetId: changeSet.id,
        targets,
        expectedVersion: changeSet.version,
        clientMutationId: createMutationId(),
      }),
    );
  };

  return (
    <section className="aw-card">
      <h2>Actions</h2>
      <ActionNotice message={notice} />
      {changeSet.status === 'ready' && (
        <button
          className="aw-button aw-button--primary"
          onClick={() =>
            void action(() =>
              client.approveChangeSet(changeSet.id, {
                expectedVersion: changeSet.version,
                clientMutationId: createMutationId(),
              }),
            )
          }
        >
          Approve ChangeSet
        </button>
      )}
      {['ready', 'approved'].includes(changeSet.status) && (
        <div className="aw-toolbar">
          <label className="aw-field aw-field--grow">
            <span>rejectionReason</span>
            <input
              className="aw-input"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
            />
          </label>
          <button
            className="aw-button aw-button--danger"
            onClick={() =>
              void action(() =>
                client.rejectChangeSet(changeSet.id, {
                  reason: rejectionReason || null,
                  expectedVersion: changeSet.version,
                  clientMutationId: createMutationId(),
                }),
              )
            }
          >
            Reject
          </button>
        </div>
      )}
      {changeSet.status === 'approved' && !delivery && (
        <>
          <h3>Delivery Targets</h3>
          {changeSet.repositoryChanges.map((repositoryChange) =>
            (['commit', 'push', 'pull_request', 'deploy'] as const).map((kind) => {
              const key = targetKey(repositoryChange.repositoryId, kind);
              return (
                <label className="aw-field aw-field--inline" key={key}>
                  <input type="checkbox" checked={selectedTargets.includes(key)} onChange={() => toggleTarget(key)} />
                  <span>
                    {repositoryChange.repositoryId} · {kind}
                  </span>
                </label>
              );
            }),
          )}
          <button className="aw-button aw-button--primary" disabled={selectedTargets.length === 0} onClick={deliver}>
            Create Delivery
          </button>
        </>
      )}
      {delivery && (
        <>
          <h3>Retry Targets</h3>
          {delivery.targets.map((target) => {
            const retryable = target.status === 'failed' || target.status === 'partial';
            return (
              <label className="aw-field aw-field--inline" key={target.id}>
                <input
                  type="checkbox"
                  disabled={!retryable}
                  checked={retryTargetIds.includes(target.id)}
                  onChange={() =>
                    setRetryTargetIds((current) =>
                      current.includes(target.id)
                        ? current.filter((item) => item !== target.id)
                        : [...current, target.id],
                    )
                  }
                />
                <span>
                  {target.id} · {target.kind} · {target.status}
                </span>
              </label>
            );
          })}
          <div className="aw-toolbar">
            {(delivery.status === 'failed' || delivery.status === 'partial') && (
              <button
                className="aw-button"
                disabled={retryTargetIds.length === 0}
                onClick={() =>
                  void action(() =>
                    client.retryDelivery(delivery.id, {
                      targetIds: retryTargetIds,
                      expectedVersion: delivery.version,
                      clientMutationId: createMutationId(),
                    }),
                  )
                }
              >
                Retry selected
              </button>
            )}
            {delivery.status === 'outcome_unknown' && (
              <button
                className="aw-button aw-button--primary"
                onClick={() =>
                  void action(() =>
                    client.reconcileDelivery(delivery.id, {
                      expectedVersion: delivery.version,
                      clientMutationId: createMutationId(),
                    }),
                  )
                }
              >
                Reconcile
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ChangeSetDetailContent({
  snapshot,
  projectId,
  detail,
  runDetail,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  detail: ChangeSetDetail;
  runDetail: RunDetail;
}) {
  const changeSet = detail.changeSet;
  const delivery = detail.delivery;
  return (
    <section className="aw-page">
      <PageHeader
        title={changeSet.summary ?? changeSet.id}
        subtitle={changeSet.id}
        actions={
          <Link className="aw-button aw-button--ghost" to={workspacePath(`/projects/${projectId}/changes`)}>
            返回 Changes
          </Link>
        }
      />
      <ProjectTabs projectId={projectId} />
      <ExecutionTrace
        snapshot={snapshot}
        projectId={projectId}
        run={runDetail.run}
        contextSnapshot={runDetail.contextSnapshot}
        changeSet={changeSet}
        delivery={delivery}
      />
      <ChangeSetActions detail={detail} />
      <article className="aw-change-set">
        <div className="aw-card-header">
          <Status value={changeSet.status} />
          {delivery && <Status value={delivery.status} />}
        </div>
        <KeyValue
          entries={[
            { label: 'runId', value: changeSet.runId },
            { label: 'taskId', value: changeSet.taskId },
            { label: 'deliveryId', value: changeSet.deliveryId },
            { label: 'rejectionReason', value: changeSet.rejectionReason },
            { label: 'approvedAt', value: changeSet.approvedAt },
            { label: 'rejectedAt', value: changeSet.rejectedAt },
            { label: 'createdAt', value: changeSet.createdAt },
          ]}
        />
        {changeSet.repositoryChanges.map((repositoryChange) => {
          const repository = snapshot.repositories.find((item) => item.id === repositoryChange.repositoryId);
          return (
            <section className="aw-repository-change" key={repositoryChange.repositoryId}>
              <div className="aw-card-header">
                <h2>{repository?.name ?? repositoryChange.repositoryId}</h2>
                {repository && <Status value={String(repository.dirty)} />}
              </div>
              <KeyValue
                entries={[
                  { label: 'repositoryId', value: repositoryChange.repositoryId },
                  { label: 'baseSha', value: repositoryChange.baseSha },
                  { label: 'resultSha', value: repositoryChange.resultSha },
                  { label: 'branch', value: repositoryChange.branch },
                  { label: 'worktreePath', value: repositoryChange.worktreePath },
                ]}
              />
              <h3>Files</h3>
              <div className="aw-file-list">
                {repositoryChange.files.map((file) => (
                  <details key={`${file.action}:${file.path}`}>
                    <summary>
                      <Status value={file.action} /> {file.path}
                    </summary>
                    <KeyValue
                      entries={[
                        { label: 'previousPath', value: file.previousPath },
                        { label: 'binary', value: file.binary },
                      ]}
                    />
                    <ArtifactReference artifact={file.diff} />
                  </details>
                ))}
              </div>
              <h3>Commands</h3>
              {repositoryChange.commands.map((command) => (
                <details key={command.id}>
                  <summary>
                    <Status value={command.status} /> {command.command}
                  </summary>
                  <KeyValue
                    entries={[
                      { label: 'exitCode', value: command.exitCode },
                      { label: 'startedAt', value: command.startedAt },
                      { label: 'completedAt', value: command.completedAt },
                    ]}
                  />
                  <h4>stdout</h4>
                  <ArtifactReference artifact={command.stdout} />
                  <h4>stderr</h4>
                  <ArtifactReference artifact={command.stderr} />
                </details>
              ))}
            </section>
          );
        })}
      </article>

      <section className="aw-delivery">
        <h2>Delivery</h2>
        {delivery ? (
          <>
            <KeyValue
              entries={[
                { label: 'id', value: delivery.id },
                { label: 'status', value: delivery.status, node: <Status value={delivery.status} /> },
                { label: 'createdAt', value: delivery.createdAt },
                { label: 'completedAt', value: delivery.completedAt },
              ]}
            />
            {delivery.targets.map((target) => {
              const repository = snapshot.repositories.find((item) => item.id === target.repositoryId);
              return (
                <article className="aw-delivery-step" key={target.id}>
                  <div className="aw-card-header">
                    <strong>{repository?.name ?? target.repositoryId}</strong>
                    <span>{target.kind}</span>
                    <Status value={target.status} />
                  </div>
                  <KeyValue
                    entries={[
                      { label: 'id', value: target.id },
                      { label: 'attempt', value: target.attempt },
                      { label: 'reference', value: target.reference },
                      { label: 'detail', value: target.detail },
                      { label: 'error', value: target.error },
                      { label: 'startedAt', value: target.startedAt },
                      { label: 'completedAt', value: target.completedAt },
                    ]}
                  />
                </article>
              );
            })}
          </>
        ) : (
          <RawValue value={null} />
        )}
      </section>
    </section>
  );
}
