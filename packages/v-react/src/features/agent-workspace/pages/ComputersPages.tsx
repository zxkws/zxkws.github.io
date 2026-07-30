import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ComputerPairing, WorkspaceBootstrap } from '../domain';
import { useAgentWorkspaceClient } from '../data/context';
import { ActionNotice, EmptyState, KeyValue, PageHeader, RawValue, Status } from '../components/Primitives';
import { workspacePath } from '../components/paths';
import { createMutationId } from '../components/mutations';

export function ComputersPage({ snapshot }: { snapshot: WorkspaceBootstrap }) {
  const client = useAgentWorkspaceClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [pairing, setPairing] = useState<ComputerPairing | null>(null);

  const pair = async () => {
    setNotice(null);
    try {
      const receipt = await client.pairComputer({ clientMutationId: createMutationId() });
      setPairing(receipt.resource);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <section className="aw-page">
      <PageHeader
        title="Computers"
        subtitle={`${snapshot.computers.length} computers`}
        actions={
          <button className="aw-button aw-button--primary" onClick={() => void pair()}>
            Pair Computer
          </button>
        }
      />
      <ActionNotice message={notice} />
      {pairing && (
        <section className="aw-card" role="status">
          <div className="aw-card-header">
            <h2>Computer Pairing</h2>
            <Status value={pairing.status} />
          </div>
          <KeyValue
            entries={[
              { label: 'id', value: pairing.id },
              { label: 'code', value: pairing.code },
              { label: 'expiresAt', value: pairing.expiresAt },
              { label: 'installCommand', value: pairing.installCommand },
            ]}
          />
          <button className="aw-button aw-button--ghost" onClick={() => setPairing(null)}>
            关闭
          </button>
        </section>
      )}
      {snapshot.computers.length === 0 ? (
        <EmptyState title="暂无 Computer" detail="Pair macOS Runner 后才能执行 Codex 和 Claude Code。" />
      ) : (
        <div className="aw-computer-grid">
          {snapshot.computers.map((computer) => (
            <article className="aw-computer-card" key={computer.id}>
              <div className="aw-card-header">
                <h2>
                  <Link className="aw-link" to={workspacePath(`/computers/${computer.id}`)}>
                    {computer.name}
                  </Link>
                </h2>
                <Status value={computer.status} />
              </div>
              <KeyValue
                entries={[
                  { label: 'os', value: computer.os },
                  { label: 'architecture', value: computer.architecture },
                  { label: 'daemonVersion', value: computer.daemonVersion },
                  { label: 'protocolVersion', value: computer.protocolVersion },
                  { label: 'lastHeartbeat', value: computer.lastHeartbeat },
                  { label: 'currentLeaseId', value: computer.currentLeaseId },
                  { label: 'queueDepth', value: computer.queueDepth },
                  { label: 'outboxDepth', value: computer.outboxDepth },
                  { label: 'draining', value: computer.status === 'draining' },
                ]}
              />
              <Link className="aw-button" to={workspacePath(`/computers/${computer.id}`)}>
                打开 Computer
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ComputerDetailPage({ snapshot, computerId }: { snapshot: WorkspaceBootstrap; computerId: string }) {
  const client = useAgentWorkspaceClient();
  const computer = snapshot.computers.find((item) => item.id === computerId);
  const [notice, setNotice] = useState<string | null>(null);
  if (!computer) return <EmptyState title="Computer 不存在" detail={computerId} />;
  const agents = snapshot.agents.filter((agent) => agent.computerId === computer.id);
  const activeRuns = agents.filter((agent) => agent.currentRunId !== null);

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
        title={computer.name}
        subtitle={computer.id}
        actions={
          <>
            <button
              className="aw-button"
              onClick={() =>
                void action(() =>
                  client.setComputerDraining(computer.id, {
                    draining: computer.status !== 'draining',
                    expectedVersion: computer.version,
                    clientMutationId: createMutationId(),
                  }),
                )
              }
            >
              {computer.status === 'draining' ? '停止 Drain' : 'Drain'}
            </button>
            <button
              className="aw-button aw-button--danger"
              onClick={() => {
                if (window.confirm(`Revoke Computer ${computer.id}？`)) {
                  void action(() =>
                    client.revokeComputer(computer.id, {
                      expectedVersion: computer.version,
                      clientMutationId: createMutationId(),
                    }),
                  );
                }
              }}
            >
              Revoke
            </button>
          </>
        }
      />
      <ActionNotice message={notice} />
      <div className="aw-detail-grid">
        <article className="aw-card">
          <div className="aw-card-header">
            <Status value={computer.status} />
            <Status value={String(computer.status === 'draining')} />
          </div>
          <KeyValue
            entries={[
              { label: 'daemonVersion', value: computer.daemonVersion },
              { label: 'protocolVersion', value: computer.protocolVersion },
              { label: 'os', value: computer.os },
              { label: 'architecture', value: computer.architecture },
              { label: 'lastHeartbeat', value: computer.lastHeartbeat },
              { label: 'currentLeaseId', value: computer.currentLeaseId },
              { label: 'queueDepth', value: computer.queueDepth },
              { label: 'outboxDepth', value: computer.outboxDepth },
              { label: 'doctorResult', value: computer.doctorResult },
            ]}
          />
          <h3>capabilities</h3>
          <RawValue value={computer.capabilities} />
          <h3>runtimeVersions</h3>
          <RawValue value={computer.runtimeVersions} />
        </article>
        <article className="aw-card">
          <h2>Registered Roots</h2>
          {computer.registeredRoots.map((root) => (
            <div className="aw-list-item" key={root.id}>
              <KeyValue
                entries={[
                  { label: 'id', value: root.id },
                  { label: 'alias', value: root.alias },
                  { label: 'path', value: root.path },
                  { label: 'writable', value: root.writable },
                ]}
              />
            </div>
          ))}
          <h2>Agents</h2>
          {agents.map((agent) => (
            <Link className="aw-list-item" key={agent.id} to={workspacePath(`/agents/${agent.id}`)}>
              <span>{agent.handle}</span>
              <Status value={agent.status} />
            </Link>
          ))}
          <h2>Runs</h2>
          {activeRuns.map((agent) => (
            <Link
              className="aw-list-item"
              key={agent.currentRunId}
              to={workspacePath(`/projects/${agent.projectId}/runs/${agent.currentRunId}`)}
            >
              <span>{agent.currentRunId}</span>
              <Status value={agent.status} />
            </Link>
          ))}
        </article>
      </div>
    </section>
  );
}
