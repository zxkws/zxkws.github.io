import type { HttpMethod } from '@zxkws/shared-fetch';
import { apiBaseUrl, apiRequestHeaders, client } from './httpClient';

export type AgentSkill = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  instructions: string;
  enabled: boolean;
  reviewStatus?: 'approved' | 'pending';
  source?: {
    type: 'content' | 'url' | 'github';
    url?: string;
    finalUrl?: string;
    ref?: string;
    path?: string;
    contentHash: string;
    syncedAt: string;
    status: 'synced' | 'failed';
    error?: string;
    frontmatter: {
      name: string;
      description: string;
      license?: string;
      compatibility?: string;
      metadata?: Record<string, string>;
      allowedTools?: string;
    };
  } | null;
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
  sourceType: 'manual' | 'json';
  sourceName?: string;
  importedAt?: string;
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
  channelId?: number;
  model?: string;
  skillIds: string[];
  knowledgeBaseIds: string[];
  mcpServerIds: string[];
  approvedToolKeys: string[];
};

export type AgentTaskStep = {
  id: string;
  title: string;
  description: string;
  kind: 'requirements' | 'inspect' | 'execute' | 'verify' | 'deliver';
};

export type AgentTaskMaterialRequirement = {
  key: string;
  label: string;
  description: string;
};

export type AgentTaskApprovalRequest = {
  approvalId: string;
  kind: 'mcp_tool' | 'ssh_operation';
  title: string;
  description: string;
  toolKey: string;
  serverId: string;
  serverCode: string;
  toolName: string;
  risk: 'write' | 'execute' | 'external';
};

export type AgentTaskPlan = {
  version: 1;
  goal: string;
  summary: string;
  steps: AgentTaskStep[];
  missingMaterials: AgentTaskMaterialRequirement[];
  approvalRequests: AgentTaskApprovalRequest[];
  risks: string[];
  capabilityWarnings: string[];
  selected: {
    skillIds: string[];
    knowledgeBaseIds: string[];
    mcpServerIds: string[];
    channelId?: number;
    model?: string;
    workspace?: {
      provider: 'elderberry-ssh';
      directory: string;
    };
  };
  workspaceProbe?: Record<string, unknown>;
  planner: {
    source: 'model' | 'fallback';
    model?: string;
    channelName?: string;
  };
};

export type AgentTask = {
  run: AgentRun;
  plan: AgentTaskPlan;
  state: 'waiting_for_input' | 'waiting_for_approval' | 'ready' | 'running' | 'completed' | 'failed' | 'cancelled';
  missingMaterials: AgentTaskMaterialRequirement[];
  pendingApprovals: AgentTaskApprovalRequest[];
  approvalDecisions: Record<string, { approved: boolean; note?: string }>;
  providedMaterialKeys: string[];
  inputs: Record<string, string>;
};

export type CreateAgentTaskPlanInput = {
  goal: string;
  context?: string;
  idempotencyKey?: string;
  threadId?: string;
  channelId?: number;
  model?: string;
  workspaceProvider?: 'elderberry-ssh';
  workspaceDirectory?: string;
  materials?: Array<{
    key: string;
    label: string;
    value?: string;
    required?: boolean;
    description?: string;
  }>;
  skillIds: string[];
  knowledgeBaseIds: string[];
  mcpServerIds: string[];
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

export type ImportMcpServersResult = {
  created: AgentMcpServer[];
  skipped: Array<{ name: string; reason: string }>;
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

const consumeRunStream = async (response: Response, onEvent: (event: AgentRunEvent) => void): Promise<AgentRun> => {
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
  return consumeRunStream(response, onEvent);
};

const streamTaskResume = async (id: string, onEvent: (event: AgentRunEvent) => void, signal?: AbortSignal) => {
  const response = await fetch(`${apiBaseUrl}/v1/agent/tasks/${id}/resume/stream`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: apiRequestHeaders(),
  });
  return consumeRunStream(response, onEvent);
};

export const agentPlatformService = {
  capabilities: () => request<unknown>('/v1/agent/capabilities'),
  listSkills: () => request<AgentSkill[]>('/v1/agent/skills'),
  createSkill: (data: Omit<AgentSkill, 'id' | 'createdAt' | 'updatedAt'>) =>
    request<AgentSkill>('/v1/agent/skills', 'POST', data),
  importSkill: (data: {
    sourceType: 'content' | 'url' | 'github';
    content?: string;
    url?: string;
    ref?: string;
    path?: string;
  }) => request<AgentSkill>('/v1/agent/skills/import', 'POST', data),
  refreshSkill: (id: string) => request<AgentSkill>(`/v1/agent/skills/${id}/refresh`, 'POST'),
  updateSkill: (id: string, data: Partial<AgentSkill>) => request<AgentSkill>(`/v1/agent/skills/${id}`, 'PATCH', data),
  deleteSkill: (id: string) => request<{ success: boolean }>(`/v1/agent/skills/${id}`, 'DELETE'),
  listMcpServers: () => request<AgentMcpServer[]>('/v1/agent/mcp-servers'),
  createMcpServer: (data: Record<string, unknown>) => request<AgentMcpServer>('/v1/agent/mcp-servers', 'POST', data),
  importMcpServers: (data: { sourceName: string; config: Record<string, unknown> }) =>
    request<ImportMcpServersResult>('/v1/agent/mcp-servers/import', 'POST', data),
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
  workspaceGuides: () => request<Record<string, unknown>>('/v1/agent/tasks/workspace-guides'),
  listWorkspaces: () =>
    request<
      Array<{
        provider: 'elderberry-ssh';
        name: string;
        target: string;
        defaultDirectory: string;
        allowedRoots: string[];
        capability: Record<string, unknown>;
      }>
    >('/v1/agent/tasks/workspaces'),
  probeWorkspace: (provider: 'elderberry-ssh', directory?: string) =>
    request<Record<string, unknown>>(`/v1/agent/tasks/workspaces/${provider}/probe`, 'POST', { directory }),
  planTask: (data: CreateAgentTaskPlanInput) => request<AgentTask>('/v1/agent/tasks/plan', 'POST', data),
  getTask: (id: string) => request<AgentTask>(`/v1/agent/tasks/${id}`),
  submitTaskInput: (id: string, materials: Array<{ key: string; value: string }>) =>
    request<AgentTask>(`/v1/agent/tasks/${id}/input`, 'POST', { materials }),
  submitTaskApprovals: (id: string, decisions: Array<{ approvalId: string; approved: boolean; note?: string }>) =>
    request<AgentTask>(`/v1/agent/tasks/${id}/approvals`, 'POST', { decisions }),
  resumeTask: (id: string) => request<AgentRun>(`/v1/agent/tasks/${id}/resume`, 'POST'),
  run: (data: CreateAgentRunInput) => request<AgentRun>('/v1/agent/runs', 'POST', data),
  streamRun,
  streamTaskResume,
};
