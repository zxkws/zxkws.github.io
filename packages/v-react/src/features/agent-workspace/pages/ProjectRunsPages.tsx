import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { RunDetail, RunInputRequest, WorkspaceBootstrap } from '../domain';
import { useAgentWorkspaceClient, useProjectOverview, useRun, useRunEvents, useRuns } from '../data/context';
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
import { workspacePath } from '../components/paths';
import { createMutationId, receiptEntityId } from '../components/mutations';
import { CursorPager } from '../components/CursorPager';

export function ProjectRunsPage({ snapshot, projectId }: { snapshot: WorkspaceBootstrap; projectId: string }) {
  const overviewQuery = useProjectOverview(projectId);
  const [cursor, setCursor] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState('all');
  const runsQuery = useRuns(projectId, {
    cursor,
    limit: 50,
    ...(statusFilter === 'all' ? {} : { status: statusFilter }),
  });
  const project = overviewQuery.data?.project;
  const runs = runsQuery.data?.items ?? [];
  if (overviewQuery.isPending) return <LoadingState />;
  if (overviewQuery.isError)
    return <ErrorState error={overviewQuery.error} retry={() => void overviewQuery.refetch()} />;
  if (!project) return <EmptyState title="Project 不存在" detail={projectId} />;

  return (
    <section className="aw-page">
      <PageHeader title={`${project.name} / Runs`} subtitle={`${runs.length} runs`} />
      <ProjectTabs projectId={projectId} />
      <div className="aw-toolbar">
        <label className="aw-field">
          <span>status</span>
          <select className="aw-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>all</option>
            {Array.from(new Set(runs.map((run) => run.status))).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      {runsQuery.isPending ? (
        <LoadingState />
      ) : runsQuery.isError ? (
        <ErrorState error={runsQuery.error} retry={() => void runsQuery.refetch()} />
      ) : runs.length === 0 ? (
        <EmptyState title="暂无 Run" />
      ) : (
        <div className="aw-run-list">
          {runs.map((run) => {
            const agent = snapshot.agents.find((item) => item.id === run.agentId);
            const computer = snapshot.computers.find((item) => item.id === run.computerId);
            return (
              <Link className="aw-list-item" key={run.id} to={workspacePath(`/projects/${projectId}/runs/${run.id}`)}>
                <div>
                  <strong>{run.id}</strong>
                  <div className="aw-meta">
                    <span>{agent?.handle ?? run.agentId}</span>
                    <span>{run.runtime}</span>
                    <span>{run.model}</span>
                    <span>{computer?.name ?? run.computerId}</span>
                  </div>
                </div>
                <div>
                  <Status value={run.status} />
                  <span>{run.createdAt}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {runsQuery.data && <CursorPager page={runsQuery.data} onCursor={setCursor} />}
    </section>
  );
}

export function RunDetailPage({
  snapshot,
  projectId,
  runId,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  runId: string;
}) {
  const runQuery = useRun(runId);
  if (runQuery.isPending) return <LoadingState />;
  if (runQuery.isError) return <ErrorState error={runQuery.error} retry={() => void runQuery.refetch()} />;
  if (runQuery.data.run.projectId !== projectId) return <EmptyState title="Run 不属于当前 Project" detail={runId} />;
  return <RunDetailContent snapshot={snapshot} projectId={projectId} detail={runQuery.data} />;
}

function RunInputReply({ request }: { request: RunInputRequest }) {
  const client = useAgentWorkspaceClient();
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const reply = async () => {
    if (!content.trim()) return;
    setNotice(null);
    try {
      await client.replyToRunInput({
        runId: request.runId,
        inputRequestId: request.id,
        content,
        attachmentIds: [],
        clientMutationId: createMutationId(),
      });
      setContent('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };
  return (
    <article className="aw-card" data-status={request.status}>
      <div className="aw-card-header">
        <strong>{request.prompt}</strong>
        <Status value={request.status} />
      </div>
      <KeyValue
        entries={[
          { label: 'id', value: request.id },
          { label: 'messageId', value: request.messageId },
          { label: 'responseMessageId', value: request.responseMessageId },
          { label: 'createdAt', value: request.createdAt },
          { label: 'answeredAt', value: request.answeredAt },
        ]}
      />
      {request.status === 'open' && (
        <>
          <textarea
            className="aw-textarea"
            rows={4}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <button className="aw-button aw-button--primary" disabled={!content.trim()} onClick={() => void reply()}>
            回复 Agent
          </button>
        </>
      )}
      <ActionNotice message={notice} />
    </article>
  );
}

function RunDetailContent({
  snapshot,
  projectId,
  detail,
}: {
  snapshot: WorkspaceBootstrap;
  projectId: string;
  detail: RunDetail;
}) {
  const client = useAgentWorkspaceClient();
  const navigate = useNavigate();
  const run = detail.run;
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [eventCursor, setEventCursor] = useState<string | undefined>();
  const eventsQuery = useRunEvents(run.id, { cursor: eventCursor, limit: 100 });
  const agent = snapshot.agents.find((item) => item.id === run.agentId);
  const computer = snapshot.computers.find((item) => item.id === run.computerId);
  const contextSnapshot = detail.contextSnapshot;
  const changeSet = detail.changeSet;
  const delivery = detail.delivery;
  const events = eventsQuery.data?.items ?? detail.events.items;

  const cancel = async () => {
    setNotice(null);
    try {
      await client.cancelRun(run.id, {
        expectedVersion: run.version,
        clientMutationId: createMutationId(),
      });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  const retry = async () => {
    setNotice(null);
    try {
      const receipt = await client.retryRun(run.id, {
        expectedVersion: run.version,
        clientMutationId: createMutationId(),
      });
      const nextRunId = receiptEntityId(receipt);
      navigate(workspacePath(`/projects/${projectId}/runs/${nextRunId}`));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader
        title={`Run ${run.id}`}
        subtitle={
          <>
            {run.runtime} · {run.model} · attempt {run.attempt}
          </>
        }
        actions={
          <>
            <button className="aw-button aw-button--ghost" onClick={() => setInspectorOpen(true)}>
              Context
            </button>
            {['queued', 'running', 'waiting_input'].includes(run.status) && (
              <button className="aw-button aw-button--danger" onClick={() => void cancel()}>
                Cancel
              </button>
            )}
            {['failed', 'cancelled', 'interrupted'].includes(run.status) && (
              <button className="aw-button aw-button--primary" onClick={() => void retry()}>
                Retry
              </button>
            )}
          </>
        }
      />
      <ProjectTabs projectId={projectId} />
      <ActionNotice message={notice} />
      <ExecutionTrace
        snapshot={snapshot}
        projectId={projectId}
        run={run}
        contextSnapshot={contextSnapshot}
        changeSet={changeSet}
        delivery={delivery}
      />

      <div className="aw-run-layout">
        <article className="aw-run-detail">
          <div className="aw-card-header">
            <Status value={run.status} />
            {computer && <Status value={computer.status} />}
          </div>
          <KeyValue
            entries={[
              { label: 'agentId', value: run.agentId, node: agent?.handle },
              { label: 'computerId', value: run.computerId, node: computer?.name },
              { label: 'taskId', value: run.taskId },
              { label: 'sessionId', value: run.sessionId },
              { label: 'attempt', value: run.attempt },
              { label: 'leaseId', value: run.leaseId },
              { label: 'fenceSequence', value: run.fenceSequence },
              { label: 'retryOfRunId', value: run.retryOfRunId },
              { label: 'rootRunId', value: run.rootRunId },
              { label: 'checkpoint', value: run.checkpoint },
              { label: 'error', value: run.error },
              { label: 'createdAt', value: run.createdAt },
              { label: 'startedAt', value: run.startedAt },
              { label: 'completedAt', value: run.completedAt },
            ]}
          />
          <h2>Usage</h2>
          <KeyValue
            entries={[
              { label: 'inputTokens', value: run.usage.inputTokens },
              { label: 'outputTokens', value: run.usage.outputTokens },
              { label: 'totalTokens', value: run.usage.totalTokens },
              { label: 'providerReportedCost', value: run.usage.providerReportedCost },
              { label: 'estimatedCost', value: run.usage.estimatedCost },
            ]}
          />
          <h2>Events</h2>
          {eventsQuery.isPending && detail.events.items.length === 0 ? (
            <LoadingState />
          ) : eventsQuery.isError ? (
            <ErrorState error={eventsQuery.error} retry={() => void eventsQuery.refetch()} />
          ) : events.length === 0 ? (
            <span>null</span>
          ) : (
            <div className="aw-run-event-list" aria-live="polite">
              {events.map((event) => (
                <article className="aw-run-event" key={event.id} data-status={event.level}>
                  <div className="aw-card-header">
                    <span>{event.type}</span>
                    <Status value={event.level} />
                    <span>{event.sequence}</span>
                    <span>{event.createdAt}</span>
                  </div>
                  <RawValue value={event.message} />
                  {event.data !== null && <RawValue value={event.data} />}
                  <div className="aw-meta">
                    <span>truncated: {String(event.truncated)}</span>
                    <span>artifactId: {String(event.artifactId)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
          {eventsQuery.data && <CursorPager page={eventsQuery.data} onCursor={setEventCursor} />}
          <h2>Input Requests</h2>
          {detail.inputRequests.map((request) => (
            <RunInputReply key={request.id} request={request} />
          ))}
        </article>

        {inspectorOpen && (
          <button
            className="aw-inspector-backdrop"
            aria-label="关闭 ContextSnapshot"
            onClick={() => setInspectorOpen(false)}
          />
        )}
        <aside className="aw-inspector" data-open={String(inspectorOpen)}>
          <button className="aw-icon-button aw-inspector-close" onClick={() => setInspectorOpen(false)}>
            关闭
          </button>
          <h2>ContextSnapshot</h2>
          {contextSnapshot ? (
            <div className="aw-context-snapshot">
              <KeyValue
                entries={[
                  { label: 'id', value: contextSnapshot.id },
                  { label: 'conversationCursor', value: contextSnapshot.conversationCursor },
                  { label: 'triggerMessageId', value: contextSnapshot.triggerMessageId },
                  { label: 'taskId', value: contextSnapshot.taskId },
                  { label: 'agentConfigurationVersion', value: contextSnapshot.agentConfigurationVersion },
                  { label: 'runtime', value: contextSnapshot.runtime },
                  { label: 'model', value: contextSnapshot.model },
                  { label: 'createdAt', value: contextSnapshot.createdAt },
                ]}
              />
              <h3>repositoryBases</h3>
              <RawValue value={contextSnapshot.repositoryBases} />
              <h3>selectedMessageIds</h3>
              <RawValue value={contextSnapshot.selectedMessageIds} />
              <h3>selectedMemoryIds</h3>
              <RawValue value={contextSnapshot.selectedMemoryIds} />
              <h3>skillIds</h3>
              <RawValue value={contextSnapshot.skillIds} />
              <h3>mcpServerIds</h3>
              <RawValue value={contextSnapshot.mcpServerIds} />
              <h3>permissionSnapshot</h3>
              <RawValue value={contextSnapshot.permissionSnapshot} />
              <h3>budgetSnapshot</h3>
              <RawValue value={contextSnapshot.budgetSnapshot} />
            </div>
          ) : (
            <span>null</span>
          )}
        </aside>
      </div>
    </section>
  );
}
