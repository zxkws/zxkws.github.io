import type { HttpMethod } from '@zxkws/shared-fetch';
import { apiBaseUrl, apiRequestHeaders, backgroundClient, client } from './httpClient';

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
  status: 'pending' | 'running' | 'completed' | 'partial' | 'blocked' | 'failed' | 'cancelled';
  idempotencyKey?: string | null;
  requestHash?: string | null;
  retryOfRunId?: string | null;
  executionMode?: 'single' | 'aime';
  planRevision?: number;
  skillIds?: string[] | null;
  knowledgeBaseIds?: string[] | null;
  mcpServerIds?: string[] | null;
  approvedToolKeys?: string[] | null;
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
  executionAttempt: number;
  maxExecutionAttempts: number;
  queuedAt?: string | null;
  nextRunAt?: string | null;
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
  kind: 'mcp_tool' | 'ssh_operation' | 'runner_operation' | 'github_operation';
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
  executionMode: 'single' | 'aime';
  aime: {
    maxPlannerIterations: number;
    maxActors: number;
    maxParallelActors: number;
    maxModelCalls: number;
    maxToolCalls: number;
    maxTotalTokens: number;
    actorMaxModelCalls: number;
    actorMaxToolCalls: number;
    actorMaxTotalTokens: number;
  };
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
    workspace?:
      | {
          provider: 'elderberry-ssh';
          directory: string;
        }
      | {
          provider: 'elderberry-runner';
          workspaceId: string;
          repositoryUrl: string;
          ref: string;
        };
    github?: {
      owner: string;
      repository: string;
      baseBranch: string;
      targetBranch?: string;
      deliveryMode: 'pull_request' | 'commit_to_branch';
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
  state:
    | 'waiting_for_input'
    | 'waiting_for_approval'
    | 'ready'
    | 'running'
    | 'completed'
    | 'partial'
    | 'blocked'
    | 'failed'
    | 'cancelled';
  missingMaterials: AgentTaskMaterialRequirement[];
  pendingApprovals: AgentTaskApprovalRequest[];
  approvalDecisions: Record<string, { approved: boolean; note?: string }>;
  providedMaterialKeys: string[];
  inputs: Record<string, string>;
};

export type CreateAgentTaskPlanInput = {
  goal: string;
  context?: string;
  executionMode?: 'single' | 'aime';
  aime?: {
    maxPlannerIterations?: number;
    maxActors?: number;
    maxParallelActors?: number;
    maxModelCalls?: number;
    maxToolCalls?: number;
    maxTotalTokens?: number;
    actorMaxModelCalls?: number;
    actorMaxToolCalls?: number;
    actorMaxTotalTokens?: number;
  };
  github?: {
    owner: string;
    repository: string;
    baseBranch: string;
    targetBranch?: string;
    deliveryMode?: 'pull_request' | 'commit_to_branch';
  };
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

export type AgentTaskNodeStatus = 'pending' | 'running' | 'blocked' | 'completed' | 'failed' | 'skipped';

export type AgentTaskNode = {
  id: string;
  runId: string;
  userId: string;
  taskKey: string;
  parentId?: string | null;
  objective: string;
  completionCriteria: string[];
  dependencyKeys: string[];
  status: AgentTaskNodeStatus;
  assignedActorRunId?: string | null;
  attempt: number;
  progressSummary?: string | null;
  resultSummary?: string | null;
  artifactRefs?: string[] | null;
  planRevision: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentActorRun = {
  id: string;
  runId: string;
  taskNodeId: string;
  userId: string;
  spec: {
    persona: string;
    objective: string;
    completionCriteria: string[];
    skillIds: string[];
    knowledgeBaseIds: string[];
    exposedToolKeys: string[];
    knowledgeQuery: string;
    maxModelCalls: number;
    maxToolCalls: number;
    maxTotalTokens: number;
  };
  status: 'created' | 'running' | 'blocked' | 'completed' | 'failed';
  attempt: number;
  model?: string | null;
  channelName?: string | null;
  usage?: AgentRun['usage'];
  citations?: AgentRun['citations'];
  modelCallCount: number;
  toolCallCount: number;
  report?: Record<string, unknown> | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AgentArtifact = {
  id: string;
  runId: string;
  taskNodeId: string;
  actorRunId: string;
  userId: string;
  kind: 'file' | 'diff' | 'commit' | 'test-report' | 'url' | 'data';
  uri: string;
  hash?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export type AgentTaskProgress = {
  run: AgentRun;
  nodes: AgentTaskNode[];
  actors: AgentActorRun[];
  artifacts: AgentArtifact[];
};

export type AgentKnowledgeBaseSummary = {
  id: string;
  name: string;
  description?: string | null;
  config: Record<string, unknown>;
  stats: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AgentWorkspace =
  | {
      provider: 'elderberry-runner';
      name: string;
      target: string;
      defaultFor: 'github';
      isolation: string;
      capability: Record<string, unknown>;
    }
  | {
      provider: 'elderberry-ssh';
      name: string;
      target: string;
      defaultDirectory: string;
      allowedRoots: string[];
      capability: Record<string, unknown>;
    };

export type AgentAiChannelSummary = {
  id: number;
  name: string;
  type: string;
  baseUrl: string;
  enabled: boolean;
  hasApiKey: boolean;
  models: Array<{ id: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

export type AgentGitHubRateLimit = {
  limit: string | null;
  remaining: string | null;
  reset: string | null;
  used: string | null;
  resource: string | null;
};

export type AgentGitHubConnection =
  | {
      connected: false;
    }
  | {
      connected: true;
      githubUserId: string;
      login: string;
      name: string | null;
      avatarUrl: string | null;
      htmlUrl: string | null;
      scopes: string[];
      requestedScopes: string[];
      missingScopes: string[];
      scopeVerifiedAt: string;
      credentialUpdatedAt: string | null;
      rateLimit: AgentGitHubRateLimit;
    };

export type AgentGitHubCapabilities = {
  webOAuthConfigured: boolean;
  deviceFlowConfigured: boolean;
  requestedScopes: string[];
};

export type AgentGitHubDeviceSession = {
  status: 'pending';
  userCode: string;
  verificationUri: string;
  expiresAt: string;
  interval: number;
  nextPollAt: string;
  pollToken: string;
};

export type AgentGitHubDevicePoll =
  | {
      status: 'authorization_pending' | 'slow_down';
      interval: number;
      nextPollAt: string;
      expiresAt: string;
      pollToken: string;
    }
  | {
      status: 'connected';
      connection: Extract<AgentGitHubConnection, { connected: true }>;
    };

export type AgentGitHubRepository = {
  id: number;
  name: string;
  fullName: string;
  owner: {
    id: number;
    login: string;
    avatarUrl: string | null;
    htmlUrl: string | null;
  } | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  visibility: string | null;
  description: string | null;
  htmlUrl: string | null;
  cloneUrl: string | null;
  sshUrl: string | null;
  defaultBranch: string | null;
  language: string | null;
  permissions: Record<string, boolean> | null;
  openIssuesCount: number | null;
  updatedAt: string | null;
  pushedAt: string | null;
};

export type AgentGitHubBranch = {
  name: string;
  protected: boolean;
  commit: {
    sha: string;
    url: string;
  };
};

export type AgentGitHubPullRequest = {
  id: number;
  number: number;
  state: string;
  title: string;
  body: string | null;
  draft: boolean;
  merged: boolean;
  htmlUrl: string | null;
  diffUrl: string | null;
  patchUrl: string | null;
  user: {
    id: number;
    login: string;
    avatarUrl: string | null;
    htmlUrl: string | null;
  } | null;
  head: {
    label: string;
    ref: string;
    sha: string;
    repoFullName: string | null;
  } | null;
  base: {
    label: string;
    ref: string;
    sha: string;
    repoFullName: string | null;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  mergedAt: string | null;
};

export type AgentGitHubPage<T> = {
  items: T[];
  pagination: {
    page: number;
    perPage: number;
    hasNext: boolean;
    nextPage: number | null;
  };
  rateLimit?: AgentGitHubRateLimit;
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

export const agentPlatformService = {
  capabilities: () => request<unknown>('/v1/agent/capabilities'),
  listKnowledgeBases: () => request<AgentKnowledgeBaseSummary[]>('/ai/knowledge-bases'),
  listAiChannels: () => request<AgentAiChannelSummary[]>('/ai/admin/channels'),
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
  getRun: (id: string) => backgroundRequest<AgentRun>(`/v1/agent/runs/${id}`),
  listRunEvents: (id: string, after?: number) =>
    backgroundRequest<AgentRunEvent[]>(`/v1/agent/runs/${id}/events`, after ? { after } : undefined),
  cancelRun: (id: string) => request<AgentRun>(`/v1/agent/runs/${id}/cancel`, 'POST'),
  retryRun: (id: string) => request<AgentRun>(`/v1/agent/runs/${id}/retry`, 'POST'),
  listEvaluations: (id: string) => request<AgentEvaluation[]>(`/v1/agent/runs/${id}/evaluations`),
  evaluateRun: (id: string, data: Record<string, unknown>) =>
    request<AgentEvaluation>(`/v1/agent/runs/${id}/evaluations`, 'POST', data),
  workspaceGuides: () => request<Record<string, unknown>>('/v1/agent/tasks/workspace-guides'),
  listWorkspaces: () => request<AgentWorkspace[]>('/v1/agent/tasks/workspaces'),
  probeWorkspace: (provider: 'elderberry-ssh', directory?: string) =>
    request<Record<string, unknown>>(`/v1/agent/tasks/workspaces/${provider}/probe`, 'POST', { directory }),
  planTask: (data: CreateAgentTaskPlanInput) => request<AgentTask>('/v1/agent/tasks/plan', 'POST', data),
  getTask: (id: string) => backgroundRequest<AgentTask>(`/v1/agent/tasks/${id}`),
  getTaskProgress: (id: string) => backgroundRequest<AgentTaskProgress>(`/v1/agent/tasks/${id}/progress`),
  getGitHubCapabilities: () => request<AgentGitHubCapabilities>('/v1/agent/github/capabilities'),
  startGitHubOAuth: (redirect: string) =>
    request<{ authorizationUrl: string; requestedScopes: string[] }>('/v1/agent/github/oauth/start', 'GET', {
      redirect,
    }),
  startGitHubDeviceFlow: () => request<AgentGitHubDeviceSession>('/v1/agent/github/device/start', 'POST'),
  pollGitHubDeviceFlow: (pollToken: string) =>
    request<AgentGitHubDevicePoll>('/v1/agent/github/device/poll', 'POST', { pollToken }),
  cancelGitHubDeviceFlow: (pollToken: string) =>
    request<{ cancelled: true }>('/v1/agent/github/device/cancel', 'POST', { pollToken }),
  getGitHubConnection: () => request<AgentGitHubConnection>('/v1/agent/github/connection'),
  disconnectGitHub: () => request<{ disconnected: boolean }>('/v1/agent/github/connection', 'DELETE'),
  listGitHubRepositories: (page = 1, perPage = 100) =>
    request<AgentGitHubPage<AgentGitHubRepository>>('/v1/agent/github/repositories', 'GET', { page, perPage }),
  getGitHubRepository: (owner: string, repository: string) =>
    request<AgentGitHubRepository>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
    ),
  listGitHubBranches: (owner: string, repository: string, page = 1, perPage = 100) =>
    request<AgentGitHubPage<AgentGitHubBranch>>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/branches`,
      'GET',
      { page, perPage },
    ),
  listGitHubPullRequests: (owner: string, repository: string, page = 1, perPage = 100) =>
    request<AgentGitHubPage<AgentGitHubPullRequest>>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/pull-requests`,
      'GET',
      { page, perPage },
    ),
  createGitHubBranch: (owner: string, repository: string, data: { branch: string; expectedHeadSha: string }) =>
    request<Record<string, unknown>>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/branches`,
      'POST',
      data,
    ),
  getGitHubContent: (owner: string, repository: string, ref: string, path = '') =>
    request<Record<string, unknown>>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents`,
      'GET',
      { ref, path },
    ),
  commitGitHubFiles: (
    owner: string,
    repository: string,
    data: {
      branch: string;
      expectedHeadSha: string;
      message: string;
      allowDefaultBranch?: boolean;
      files: Array<{
        path: string;
        action: 'upsert' | 'delete';
        content?: string;
        encoding?: 'utf-8' | 'base64';
        mode?: '100644' | '100755' | '120000';
      }>;
    },
  ) =>
    request<Record<string, unknown>>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/commits`,
      'POST',
      data,
    ),
  compareGitHubRefs: (owner: string, repository: string, base: string, head: string) =>
    request<Record<string, unknown>>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/compare`,
      'GET',
      { base, head },
    ),
  getGitHubCommitChecks: (owner: string, repository: string, sha: string) =>
    request<Record<string, unknown>>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/commits/${encodeURIComponent(sha)}/checks`,
    ),
  createGitHubPullRequest: (
    owner: string,
    repository: string,
    data: {
      title: string;
      head: string;
      branch: string;
      expectedHeadSha: string;
      base: string;
      body?: string;
      draft?: boolean;
    },
  ) =>
    request<AgentGitHubPullRequest>(
      `/v1/agent/github/repositories/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/pull-requests`,
      'POST',
      data,
    ),
  submitTaskInput: (id: string, materials: Array<{ key: string; value: string }>) =>
    request<AgentTask>(`/v1/agent/tasks/${id}/input`, 'POST', { materials }),
  submitTaskApprovals: (id: string, decisions: Array<{ approvalId: string; approved: boolean; note?: string }>) =>
    request<AgentTask>(`/v1/agent/tasks/${id}/approvals`, 'POST', { decisions }),
  resumeTask: (id: string) => request<AgentRun>(`/v1/agent/tasks/${id}/resume`, 'POST'),
  run: (data: CreateAgentRunInput) => request<AgentRun>('/v1/agent/runs', 'POST', data),
  streamRun,
};
