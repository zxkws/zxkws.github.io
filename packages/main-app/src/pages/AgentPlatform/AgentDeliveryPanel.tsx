import { message } from 'antd';
import type { AgentRun, AgentRunEvent, AgentTask, AgentTaskProgress } from '../../services/agentPlatformService';

type ArtifactView = {
  id: string;
  kind: unknown;
  uri: unknown;
  hash: unknown;
  metadata: unknown;
};

type AgentDeliveryPanelProps = {
  run: AgentRun;
  task: AgentTask | null;
  events: AgentRunEvent[];
  liveOutput: string;
  progress: AgentTaskProgress | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const textValue = (value: unknown) =>
  typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value, null, 2);

const artifactFromEvent = (event: AgentRunEvent, index: number): ArtifactView | null => {
  if (event.type !== 'artifact.created' || !isRecord(event.data)) return null;
  return {
    id: textValue(event.data.artifactId || event.id || `artifact-${index}`),
    kind: event.data.kind,
    uri: event.data.uri,
    hash: event.data.hash,
    metadata: event.data.metadata,
  };
};

const collectArtifacts = (events: AgentRunEvent[], progress: AgentTaskProgress | null) => {
  const artifacts = [
    ...(progress?.artifacts.map((artifact) => ({
      id: artifact.id,
      kind: artifact.kind,
      uri: artifact.uri,
      hash: artifact.hash,
      metadata: artifact.metadata,
    })) || []),
    ...events.map(artifactFromEvent).filter((item): item is ArtifactView => Boolean(item)),
  ];
  return [...new Map(artifacts.map((artifact) => [artifact.id, artifact])).values()];
};

const safeLink = (value: unknown) => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const deliveryData = (
  run: AgentRun,
  task: AgentTask | null,
  events: AgentRunEvent[],
  liveOutput: string,
  progress: AgentTaskProgress | null,
) => ({
  run: {
    ...run,
    output: liveOutput || run.output,
  },
  plan: task?.plan || null,
  approvalDecisions: task?.approvalDecisions || null,
  events,
  progress,
  artifacts: collectArtifacts(events, progress),
});

const markdownDocument = (
  run: AgentRun,
  task: AgentTask | null,
  events: AgentRunEvent[],
  liveOutput: string,
  progress: AgentTaskProgress | null,
) => {
  const artifacts = collectArtifacts(events, progress);
  const sections = [
    `# ${run.input}`,
    '',
    `- runId: ${run.id}`,
    `- threadId: ${run.threadId}`,
    `- status: ${run.status}`,
    `- model: ${run.model}`,
    `- channelName: ${run.channelName}`,
    '',
    '## 结果',
    '',
    liveOutput || run.output || '',
  ];
  if (task?.plan) {
    sections.push('', '## 计划', '', task.plan.summary);
    for (const step of task.plan.steps) {
      sections.push('', `### ${step.title}`, '', step.description);
    }
  }
  if (run.citations?.length) {
    sections.push('', '## 引用', '');
    for (const citation of run.citations) {
      sections.push(`- ${JSON.stringify(citation)}`);
    }
  }
  if (artifacts.length) {
    sections.push('', '## 产物', '');
    for (const artifact of artifacts) {
      sections.push(`- ${textValue(artifact.kind)}: ${textValue(artifact.uri)}`);
    }
  }
  return sections.join('\n');
};

const htmlDocument = (
  run: AgentRun,
  task: AgentTask | null,
  events: AgentRunEvent[],
  liveOutput: string,
  progress: AgentTaskProgress | null,
) => {
  const markdown = markdownDocument(run, task, events, liveOutput, progress);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(run.input)}</title>
  <style>
    body{max-width:920px;margin:48px auto;padding:0 24px;color:#171717;font:16px/1.75 system-ui,sans-serif}
    pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}
  </style>
</head>
<body><pre>${escapeHtml(markdown)}</pre></body>
</html>`;
};

const saveFile = (name: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

const filename = (run: AgentRun, extension: string) => `agent-${run.id}.${extension}`;

export default function AgentDeliveryPanel({ run, task, events, liveOutput, progress }: AgentDeliveryPanelProps) {
  const artifacts = collectArtifacts(events, progress);
  const output = liveOutput || run.output || '';
  const exportMarkdown = () =>
    saveFile(
      filename(run, 'md'),
      markdownDocument(run, task, events, liveOutput, progress),
      'text/markdown;charset=utf-8',
    );
  const exportJson = () =>
    saveFile(
      filename(run, 'json'),
      JSON.stringify(deliveryData(run, task, events, liveOutput, progress), null, 2),
      'application/json;charset=utf-8',
    );
  const exportText = () => saveFile(filename(run, 'txt'), output, 'text/plain;charset=utf-8');
  const exportHtml = () =>
    saveFile(filename(run, 'html'), htmlDocument(run, task, events, liveOutput, progress), 'text/html;charset=utf-8');
  const printPdf = () => {
    const popup = window.open('', '_blank');
    if (!popup) {
      message.warning('浏览器阻止了打印窗口，请允许此网站打开弹窗');
      return;
    }
    popup.opener = null;
    popup.document.open();
    popup.document.write(htmlDocument(run, task, events, liveOutput, progress));
    popup.document.close();
    window.setTimeout(() => popup.print(), 100);
  };

  return (
    <section className="agent-delivery">
      <div className="workspace-panel__header">
        <div>
          <h3>交付物</h3>
          <p className="workspace-panel__meta">
            output: {output ? 'available' : 'empty'} · artifacts: {artifacts.length}
          </p>
        </div>
        <div className="workspace-inline-actions agent-delivery__actions">
          <button type="button" className="workspace-button" disabled={!output} onClick={exportMarkdown}>
            Markdown
          </button>
          <button type="button" className="workspace-button" onClick={exportJson}>
            JSON
          </button>
          <button type="button" className="workspace-button" disabled={!output} onClick={exportText}>
            TXT
          </button>
          <button type="button" className="workspace-button" disabled={!output} onClick={exportHtml}>
            HTML
          </button>
          <button type="button" className="workspace-button" disabled={!output} onClick={printPdf}>
            打印 / PDF
          </button>
        </div>
      </div>
      {artifacts.length ? (
        <div className="agent-artifact-list">
          {artifacts.map((artifact) => {
            const href = safeLink(artifact.uri);
            return (
              <article key={artifact.id}>
                <strong>{textValue(artifact.kind)}</strong>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {textValue(artifact.uri)}
                  </a>
                ) : (
                  <span>{textValue(artifact.uri)}</span>
                )}
                <span>hash: {textValue(artifact.hash)}</span>
                {artifact.metadata ? <pre>{textValue(artifact.metadata)}</pre> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="studio-empty">当前运行还没有 artifact.created 事件。</p>
      )}
    </section>
  );
}
