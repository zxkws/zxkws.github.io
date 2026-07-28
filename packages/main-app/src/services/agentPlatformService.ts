import type { HttpMethod } from '@zxkws/shared-fetch';
import { apiBaseUrl, apiRequestHeaders, client } from './httpClient';

export type AgentSkill = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  instructions: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentMcpServer = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  transport: 'streamable-http' | 'sse' | 'stdio';
  endpoint?: string | null;
  command?: string | null;
  args?: string[] | null;
  allowedTools?: string[] | null;
  approvalRequiredTools?: string[] | null;
  enabled: boolean;
  hasSecrets: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentRun = {
  id: string;
  userId: string;
  threadId: string;
  input: string;
  output?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  idempotencyKey?: string | null;
  requestHash?: string | null;
  retryOfRunId?: string | null;
  skillIds?: string[] | null;
  knowledgeBaseIds?: string[] | null;
  mcpServerIds?: string[] | null;
  trace?: string[] | null;
  error?: string | null;
  model?: string | null;
  channelName?: string | null;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
  citations?: Array<{
    citation: string;
    knowledgeBaseId: string;
    documentId: string;
    chunkId: string;
    title: string;
    chunkIndex: number;
    charStart: number;
    charEnd: number;
    score: number;
  }> | null;
  modelCallCount: number;
  toolCallCount: number;
  eventCount: number;
  durationMs?: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  lastHeartbeatAt?: string | null;
  cancelRequestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentRunEvent = {
  id?: number;
  runId?: string;
  type: string;
  node?: string | null;
  level?: 'info' | 'warning' | 'error';
  message?: string | null;
  data?: Record<string, unknown> | null;
  createdAt?: string;
  transient?: boolean;
};

export type CreateAgentRunInput = {
  input: string;
  threadId?: string;
  idempotencyKey?: string;
  skillIds: string[];
  knowledgeBaseIds: string[];
  mcpServerIds: string[];
  approvedToolKeys: string[];
};

export type AgentEvaluation = {
  id: string;
  runId: string;
  userId: string;
  evaluator: 'rule' | 'manual';
  score: number;
  passed: boolean;
  label?: string | null;
  criteria: Record<string, unknown>;
  details: Record<string, unknown>;
  notes?: string | null;
  createdAt: string;
};

export type McpTestResult = {
  serverId: string;
  serverCode: string;
  tools: Array<{
    name: string;
    toolKey: string;
    title?: string;
    description?: string;
    inputSchema: unknown;
    outputSchema?: unknown;
    annotations?: unknown;
    allowed: boolean;
    requiresApproval: boolean;
  }>;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

const request = async <T>(path: string, method: HttpMethod = 'GET', data?: unknown): Promise<T> => {
  const response = await client<unknown>(path, data ?? {}, { method });
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

const streamRun = async (
  data: CreateAgentRunInput,
  onEvent: (event: AgentRunEvent) => void,
  signal?: AbortSignal,
): Promise<AgentRun> => {
  const response = await fetch(`${apiBaseUrl}/v1/agent/runs/stream`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...apiRequestHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw await responseError(response);
  if (!response.body) throw new Error('浏览器未提供 Agent 事件流');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AgentRun | null = null;
  const consume = (block: string) => {
    let eventType = 'message';
    let id: number | undefined;
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      else if (line.startsWith('id:')) {
        const value = Number.parseInt(line.slice(3).trim(), 10);
        if (Number.isFinite(value)) id = value;
      } else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const parsed = JSON.parse(dataLines.join('\n')) as AgentRunEvent & { run?: AgentRun; message?: string };
    const event = { ...parsed, id: parsed.id ?? id, type: parsed.type || eventType };
    if (event.type === 'stream.result' && event.run) result = event.run;
    if (event.type === 'stream.error') throw new Error(event.message || 'Agent 运行失败');
    onEvent(event);
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
  if (!result) throw new Error('Agent 事件流结束但没有返回运行结果');
  return result;
};

export const agentPlatformService = {
  capabilities: () => request<unknown>('/v1/agent/capabilities'),
  listSkills: () => request<AgentSkill[]>('/v1/agent/skills'),
  createSkill: (data: Omit<AgentSkill, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<AgentSkill>('/v1/agent/skills', 'POST', data),
  updateSkill: (id: string, data: Partial<AgentSkill>) => request<AgentSkill>(`/v1/agent/skills/${id}`, 'PATCH', data),
  deleteSkill: (id: string) => request<{ success: boolean }>(`/v1/agent/skills/${id}`, 'DELETE'),
  listMcpServers: () => request<AgentMcpServer[]>('/v1/agent/mcp-servers'),
  createMcpServer: (data: Record<string, unknown>) => request<AgentMcpServer>('/v1/agent/mcp-servers', 'POST', data),
  updateMcpServer: (id: string, data: Record<string, unknown>) =>
    request<AgentMcpServer>(`/v1/agent/mcp-servers/${id}`, 'PATCH', data),
  deleteMcpServer: (id: string) => request<{ success: boolean }>(`/v1/agent/mcp-servers/${id}`, 'DELETE'),
  testMcpServer: (id: string) => request<McpTestResult>(`/v1/agent/mcp-servers/${id}/test`, 'POST'),
  listRuns: (threadId?: string) => request<AgentRun[]>('/v1/agent/runs', 'GET', threadId ? { threadId } : undefined),
  getRun: (id: string) => request<AgentRun>(`/v1/agent/runs/${id}`),
  listRunEvents: (id: string, after?: number) =>
    request<AgentRunEvent[]>(`/v1/agent/runs/${id}/events`, 'GET', after ? { after } : undefined),
  cancelRun: (id: string) => request<AgentRun>(`/v1/agent/runs/${id}/cancel`, 'POST'),
  retryRun: (id: string) => request<AgentRun>(`/v1/agent/runs/${id}/retry`, 'POST'),
  listEvaluations: (id: string) => request<AgentEvaluation[]>(`/v1/agent/runs/${id}/evaluations`),
  evaluateRun: (id: string, data: Record<string, unknown>) =>
    request<AgentEvaluation>(`/v1/agent/runs/${id}/evaluations`, 'POST', data),
  run: (data: CreateAgentRunInput) => request<AgentRun>('/v1/agent/runs', 'POST', data),
  streamRun,
};
