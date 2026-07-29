import type { AgentRun, AgentRunEvent, AgentTask, AgentTaskProgress } from '../../services/agentPlatformService';

type RuntimeNode = {
  key: string;
  parentKey: string;
  objective: string;
  status: string;
  actorRunId: string;
  summary: string;
};

type RuntimeActor = {
  id: string;
  taskKey: string;
  persona: string;
  status: string;
  summary: string;
};

type AgentProgressPanelProps = {
  run: AgentRun;
  task: AgentTask | null;
  events: AgentRunEvent[];
  progress: AgentTaskProgress | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const rawText = (value: unknown) =>
  typeof value === 'string' ? value : value === undefined || value === null ? '' : JSON.stringify(value);

const statusFromEvent = (event: AgentRunEvent) => {
  if (isRecord(event.data) && typeof event.data.status === 'string') return event.data.status;
  if (event.type.endsWith('.completed')) return 'completed';
  if (event.type.endsWith('.failed')) return 'failed';
  if (event.type.endsWith('.blocked')) return 'blocked';
  if (event.type.endsWith('.started') || event.type.endsWith('.running')) return 'running';
  return '';
};

const deriveRuntime = (task: AgentTask | null, events: AgentRunEvent[]) => {
  const nodeMap = new Map<string, RuntimeNode>();
  for (const step of task?.plan.steps || []) {
    nodeMap.set(step.id, {
      key: step.id,
      parentKey: '',
      objective: step.title,
      status: 'planned',
      actorRunId: '',
      summary: step.description,
    });
  }
  const actorMap = new Map<string, RuntimeActor>();

  for (const event of events) {
    const data = isRecord(event.data) ? event.data : {};
    const taskKey = rawText(data.taskKey || event.node);
    if (taskKey && (event.type.startsWith('task.') || nodeMap.has(taskKey))) {
      const current = nodeMap.get(taskKey) || {
        key: taskKey,
        parentKey: '',
        objective: '',
        status: 'pending',
        actorRunId: '',
        summary: '',
      };
      nodeMap.set(taskKey, {
        ...current,
        parentKey: rawText(data.parentKey) || current.parentKey,
        objective: rawText(data.objective) || current.objective,
        status: statusFromEvent(event) || current.status,
        actorRunId: rawText(data.actorRunId) || current.actorRunId,
        summary: rawText(data.summary || data.progressSummary || event.message) || current.summary,
      });
    }

    if (event.type.startsWith('actor.')) {
      const actorRunId = rawText(data.actorRunId || data.id);
      if (!actorRunId) continue;
      const current = actorMap.get(actorRunId) || {
        id: actorRunId,
        taskKey,
        persona: '',
        status: 'created',
        summary: '',
      };
      actorMap.set(actorRunId, {
        ...current,
        taskKey: taskKey || current.taskKey,
        persona: rawText(data.persona) || current.persona,
        status: statusFromEvent(event) || current.status,
        summary: rawText(data.summary || event.message) || current.summary,
      });
    }
  }

  return {
    nodes: [...nodeMap.values()],
    actors: [...actorMap.values()],
  };
};

const isFinished = (status: string) => ['completed', 'failed', 'skipped'].includes(status);

export default function AgentProgressPanel({ run, task, events, progress: snapshot }: AgentProgressPanelProps) {
  const derived = deriveRuntime(task, events);
  const nodeKeyById = new Map((snapshot?.nodes || []).map((node) => [node.id, node.taskKey]));
  const nodes = snapshot?.nodes.length
    ? snapshot.nodes.map((node) => ({
        key: node.taskKey,
        parentKey: node.parentId ? nodeKeyById.get(node.parentId) || node.parentId : '',
        objective: node.objective,
        status: node.status,
        actorRunId: node.assignedActorRunId || '',
        summary: node.progressSummary || node.resultSummary || '',
      }))
    : derived.nodes;
  const actors = snapshot?.actors.length
    ? snapshot.actors.map((actor) => ({
        id: actor.id,
        taskKey: nodeKeyById.get(actor.taskNodeId) || actor.taskNodeId,
        persona: actor.spec.persona,
        status: actor.status,
        summary: (isRecord(actor.report) ? rawText(actor.report.summary) : '') || actor.error || '',
      }))
    : derived.actors;
  const completed = nodes.filter((node) => isFinished(node.status)).length;
  const progress = run.status === 'completed' ? 100 : nodes.length ? Math.round((completed / nodes.length) * 100) : 0;

  return (
    <section className="agent-progress">
      <div className="workspace-panel__header">
        <div>
          <h3>执行进度</h3>
          <p className="workspace-panel__meta">
            status: {run.status} · nodes: {nodes.length} · actors: {actors.length} · events: {events.length}
          </p>
        </div>
        <strong className="agent-progress__percent">{progress}%</strong>
      </div>
      <div
        className="agent-progress__bar"
        role="progressbar"
        aria-label="任务进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      {nodes.length ? (
        <ol className="agent-runtime-nodes">
          {nodes.map((node) => (
            <li key={node.key} data-status={node.status}>
              <span className="agent-runtime-nodes__state" aria-hidden="true" />
              <div>
                <strong>{node.objective || node.key}</strong>
                <span>
                  key: {node.key} · status: {node.status}
                </span>
                {node.parentKey ? <span>parentKey: {node.parentKey}</span> : null}
                {node.actorRunId ? <span>actorRunId: {node.actorRunId}</span> : null}
                {node.summary ? <p>{node.summary}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="studio-empty">任务节点会在规划和执行后出现在这里。</p>
      )}
      {actors.length ? (
        <div className="agent-runtime-actors">
          <h4>子 Agent</h4>
          {actors.map((actor) => (
            <article key={actor.id} data-status={actor.status}>
              <strong>{actor.persona || actor.id}</strong>
              <span>
                taskKey: {actor.taskKey} · status: {actor.status}
              </span>
              {actor.summary ? <p>{actor.summary}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
