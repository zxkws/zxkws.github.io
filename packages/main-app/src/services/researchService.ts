import type { HttpMethod } from '@zxkws/shared-fetch';
import { apiBaseUrl, apiRequestHeaders, backgroundClient, client } from './httpClient';

export type ResearchDepth = 'quick' | 'standard' | 'deep';
export type ResearchDiscoveryProvider = 'searxng' | 'wikipedia' | 'openalex';
export type ResearchTaskStatus =
  | 'draft'
  | 'queued'
  | 'planning'
  | 'collecting'
  | 'researching'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ResearchPlanSection = {
  key: string;
  title: string;
  objective: string;
  queries: string[];
};

export type ResearchPlan = {
  title: string;
  thesis: string;
  searchQueries: string[];
  sections: ResearchPlanSection[];
};

export type ResearchTask = {
  id: string;
  userId: string;
  title: string;
  question: string;
  instructions?: string | null;
  language: string;
  depth: ResearchDepth;
  status: ResearchTaskStatus;
  progress: number;
  channelId?: number | null;
  channelName?: string | null;
  model?: string | null;
  discoveryProviders: ResearchDiscoveryProvider[];
  knowledgeBaseIds?: string[] | null;
  maxSections: number;
  maxSources: number;
  plan?: ResearchPlan | null;
  requirePlanApproval: boolean;
  planApprovedAt?: string | null;
  executiveSummary?: string | null;
  conclusion?: string | null;
  reportMarkdown?: string | null;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    modelCalls: number;
  } | null;
  sourceCount: number;
  sectionCount: number;
  revision: number;
  jobKind?: 'plan' | 'execute' | null;
  jobPayload?: {
    refreshUrlSources: boolean;
  } | null;
  queuedAt?: string | null;
  nextRunAt?: string | null;
  attempt: number;
  maxAttempts: number;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
  heartbeatAt?: string | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  cancelRequestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResearchSource = {
  id: string;
  taskId: string;
  userId: string;
  ordinal: number;
  citationKey: string;
  kind: 'manual' | 'url' | 'searxng' | 'wikipedia' | 'openalex' | 'knowledge-base';
  status: 'pending' | 'ready' | 'failed';
  title: string;
  url?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  content?: string | null;
  excerpt?: string | null;
  contentHash?: string | null;
  metadata?: Record<string, unknown> | null;
  error?: string | null;
  accessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResearchSection = {
  id: string;
  taskId: string;
  userId: string;
  sectionKey: string;
  ordinal: number;
  revision: number;
  title: string;
  objective: string;
  queries: string[];
  status: 'pending' | 'researching' | 'reviewing' | 'completed' | 'failed';
  content?: string | null;
  citedSourceIds?: string[] | null;
  citationKeys?: string[] | null;
  reviewIssues?: string[] | null;
  characterCount: number;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ResearchArtifact = {
  id: string;
  taskId: string;
  userId: string;
  format: 'markdown' | 'html' | 'json' | 'text' | 'docx' | 'pdf';
  encoding: 'utf8' | 'base64';
  mediaType: string;
  fileName: string;
  byteSize: number;
  sha256: string;
  revision: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type ResearchEvent = {
  id?: number;
  taskId: string;
  revision?: number;
  type: string;
  stage: string;
  level: 'info' | 'warning' | 'error';
  progress: number;
  message?: string | null;
  data?: Record<string, unknown> | null;
  createdAt?: string;
};

export type ResearchTaskDetail = {
  task: ResearchTask;
  sources: ResearchSource[];
  sections: ResearchSection[];
  artifacts: ResearchArtifact[];
  events: ResearchEvent[];
};

export type ResearchInputSource = {
  kind: 'manual' | 'url';
  title?: string;
  url?: string;
  content?: string;
  author?: string;
  publishedAt?: string;
};

export type CreateResearchTaskInput = {
  title?: string;
  question: string;
  instructions?: string;
  language?: string;
  depth?: ResearchDepth;
  channelId?: number;
  model?: string;
  discoveryProviders?: ResearchDiscoveryProvider[];
  knowledgeBaseIds?: string[];
  maxSections?: number;
  maxSources?: number;
  requirePlanApproval?: boolean;
  sources?: ResearchInputSource[];
};

export type ResearchCapabilities = {
  depths: ResearchDepth[];
  discoveryProviders: ResearchDiscoveryProvider[];
  artifactFormats: ResearchArtifact['format'][];
  builtInSearxngUrl: string;
  sourceKinds: string[];
  limits: {
    maxSections: number;
    maxSources: number;
    maxInputSources: number;
    maxManualSourceCharacters: number;
    maxRemoteSourceBytes: number;
  };
  supportsPlanApproval: boolean;
  supportsStreaming: boolean;
  supportsCancellation: boolean;
  executionMode: 'persistent-worker';
  supportsCrossInstanceCancellation: boolean;
  supportsLeaseRecovery: boolean;
  eventStreamWindowMs: number;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

const request = async <T>(path: string, method: HttpMethod = 'GET', data?: unknown): Promise<T> => {
  const response = await client<unknown>(path, data ?? {}, { method });
  return unwrap<T>(response);
};

const backgroundRequest = async <T>(path: string, data?: unknown): Promise<T> => {
  const response = await backgroundClient<unknown>(path, data ?? {}, { method: 'GET' });
  return unwrap<T>(response);
};

const responseError = async (response: Response) => {
  const contentType = response.headers.get('Content-Type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  const candidate =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).message || (payload as Record<string, unknown>).error
      : payload;
  return new Error(typeof candidate === 'string' && candidate ? candidate : `请求失败，状态码 ${response.status}`);
};

type ResearchStreamCheckpoint = {
  after: number;
  terminalStatus?: ResearchTaskStatus;
};

const terminalResearchStatuses: ResearchTaskStatus[] = ['draft', 'completed', 'failed', 'cancelled'];

const consumeResearchStream = async (
  response: Response,
  after: number,
  onEvent: (event: ResearchEvent) => void,
): Promise<ResearchStreamCheckpoint> => {
  if (!response.ok) throw await responseError(response);
  if (!response.body) throw new Error('浏览器未提供研究任务事件流');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let cursor = after;
  let terminalStatus: ResearchTaskStatus | undefined;
  const consume = (block: string) => {
    let eventType = 'message';
    let eventId: number | undefined;
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('id:')) {
        const value = Number.parseInt(line.slice(3).trim(), 10);
        if (Number.isFinite(value)) eventId = value;
      } else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const parsed = JSON.parse(dataLines.join('\n')) as ResearchEvent & {
      after?: number;
      message?: string;
      status?: ResearchTaskStatus;
    };
    if (eventType.endsWith('stream.error')) throw new Error(parsed.message || '研究任务执行失败');
    if (eventId !== undefined) cursor = Math.max(cursor, eventId);
    if (parsed.id !== undefined) cursor = Math.max(cursor, parsed.id);
    if (eventType.endsWith('stream.reconnect') && typeof parsed.after === 'number') {
      cursor = Math.max(cursor, parsed.after);
      return;
    }
    if (eventType.endsWith('stream.result') && parsed.status && terminalResearchStatuses.includes(parsed.status)) {
      terminalStatus = parsed.status;
      return;
    }
    if (!eventType.includes('.stream.')) {
      onEvent({ ...parsed, id: parsed.id ?? eventId, type: parsed.type || eventType });
    }
  };
  while (true) {
    const chunk = await reader.read();
    buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    for (const block of blocks) consume(block);
    if (chunk.done) break;
  }
  if (buffer.trim()) consume(buffer);
  return { after: cursor, terminalStatus };
};

const streamEvents = async (
  id: string,
  after: number,
  onEvent: (event: ResearchEvent) => void,
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({ after: String(Math.max(0, after)) });
  const response = await fetch(
    `${apiBaseUrl}/v1/research/tasks/${encodeURIComponent(id)}/events/stream?${query.toString()}`,
    {
      method: 'GET',
      credentials: 'include',
      signal,
      headers: apiRequestHeaders(),
    },
  );
  return consumeResearchStream(response, after, onEvent);
};

const queueExecution = (id: string) =>
  request<ResearchTaskDetail>(`/v1/research/tasks/${encodeURIComponent(id)}/execute`, 'POST', {
    refreshUrlSources: false,
  });

const downloadArtifact = async (taskId: string, artifact: ResearchArtifact) => {
  const response = await fetch(
    `${apiBaseUrl}/v1/research/tasks/${encodeURIComponent(taskId)}/artifacts/${encodeURIComponent(artifact.id)}/download`,
    {
      credentials: 'include',
      headers: apiRequestHeaders(),
    },
  );
  if (!response.ok) throw await responseError(response);
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = artifact.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const researchService = {
  capabilities: () => request<ResearchCapabilities>('/v1/research/tasks/capabilities'),
  list: () => backgroundRequest<ResearchTask[]>('/v1/research/tasks'),
  get: (id: string) => backgroundRequest<ResearchTaskDetail>(`/v1/research/tasks/${id}`),
  create: (data: CreateResearchTaskInput) => request<ResearchTaskDetail>('/v1/research/tasks', 'POST', data),
  plan: (id: string) => request<ResearchTaskDetail>(`/v1/research/tasks/${id}/plan`, 'POST'),
  updatePlan: (id: string, data: ResearchPlan) =>
    request<ResearchTaskDetail>(`/v1/research/tasks/${id}/plan`, 'PUT', data),
  approvePlan: (id: string) => request<ResearchTaskDetail>(`/v1/research/tasks/${id}/plan/approve`, 'POST'),
  addSources: (id: string, sources: ResearchInputSource[]) =>
    request<ResearchTaskDetail>(`/v1/research/tasks/${id}/sources`, 'POST', { sources }),
  removeSource: (id: string, sourceId: string) =>
    request<{ success: boolean }>(`/v1/research/tasks/${id}/sources/${sourceId}`, 'DELETE'),
  cancel: (id: string) => request<ResearchTask>(`/v1/research/tasks/${id}/cancel`, 'POST'),
  remove: (id: string) => request<{ success: boolean }>(`/v1/research/tasks/${id}`, 'DELETE'),
  events: (id: string, after?: number) =>
    backgroundRequest<ResearchEvent[]>(`/v1/research/tasks/${id}/events`, after ? { after } : undefined),
  queueExecution,
  streamEvents,
  downloadArtifact,
};
