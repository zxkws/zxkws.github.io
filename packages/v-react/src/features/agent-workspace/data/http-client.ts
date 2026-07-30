import { resolveApiBase } from '@zxkws/shared-fetch';
import type {
  ActivityEvent,
  Artifact,
  Attachment,
  AttachmentUploadGrant,
  Automation,
  ChangeSet,
  ChangeSetDetail,
  CommandReceipt,
  ComputerPairing,
  CompleteAttachmentUploadInput,
  CreateAgentInput,
  CreateAttachmentUploadInput,
  CreateAutomationInput,
  CreateDeliveryInput,
  CreateMemoryInput,
  CreateProjectInput,
  CreateRepositoryInput,
  CursorPage,
  CursorQuery,
  Delivery,
  EntityId,
  InboxItem,
  MemoryEntry,
  Message,
  MutationInput,
  PrivateDownloadGrant,
  ProjectOverview,
  ReplyToRunInput,
  ResourceRef,
  Run,
  RunDetail,
  RunEvent,
  SearchResult,
  SendMessageInput,
  SendMessageResult,
  StartRunInput,
  Task,
  TaskDetail,
  UpdateAgentInput,
  UpdateAutomationInput,
  UpdateProjectInput,
  UpdateRepositoryInput,
  UpdateTaskInput,
  VersionedMutationInput,
  WorkspaceBootstrap,
  WorkspaceConnectionState,
  WorkspaceEventEnvelope,
  WorkspaceSettings,
} from '../domain';
import type { AgentWorkspaceClient, ProjectListQuery, WorkspaceListener } from './client';

const apiBase = resolveApiBase({
  rawBase: import.meta.env.API_BASE_URL,
  dev: import.meta.env.DEV || import.meta.env.MODE === 'development',
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const shouldSendAuthHeader = (() => {
  if (typeof window === 'undefined' || !apiBase.startsWith('http')) return true;
  try {
    const apiUrl = new URL(apiBase);
    if (apiUrl.origin === window.location.origin) return true;
    const isProjectSite = (hostname: string) => hostname === 'zxkws.nyc.mn' || hostname.endsWith('.zxkws.nyc.mn');
    return !(isProjectSite(window.location.hostname) && isProjectSite(apiUrl.hostname));
  } catch {
    return true;
  }
})();

const readCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const part = document.cookie.split('; ').find((entry) => entry.startsWith(prefix));
  if (!part) return null;
  try {
    return decodeURIComponent(part.slice(prefix.length));
  } catch {
    return null;
  }
};

const authHeaders = (): Record<string, string> => {
  if (typeof window === 'undefined' || !shouldSendAuthHeader) return {};
  const token = window.localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const csrfHeaders = (): Record<string, string> => {
  const token = readCookie('csrf_token') ?? readCookie('XSRF-TOKEN');
  return token ? { 'X-CSRF-Token': token } : {};
};

type ApiEnvelope<T> = {
  code: number;
  data: T;
  message: string;
};

export class AgentWorkspaceApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown | null;
  readonly requestId: string | null;
  readonly retryAfter: string | null;
  readonly payload: unknown;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    details: unknown | null;
    requestId: string | null;
    retryAfter: string | null;
    payload: unknown;
  }) {
    super(input.message);
    this.name = 'AgentWorkspaceApiError';
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId;
    this.retryAfter = input.retryAfter;
    this.payload = input.payload;
  }
}

const parseJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const responseError = async (response: Response) => {
  const payload = await parseJson(response);
  const problem = isRecord(payload) ? payload : null;
  const rawMessage = problem?.message ?? payload;
  const message =
    typeof rawMessage === 'string'
      ? rawMessage
      : rawMessage === null
        ? `HTTP ${response.status}`
        : JSON.stringify(rawMessage) || `HTTP ${response.status}`;
  const rawCode = problem?.code;
  const fallbackCode = problem?.error;
  return new AgentWorkspaceApiError({
    status: response.status,
    code:
      typeof rawCode === 'string'
        ? rawCode
        : typeof fallbackCode === 'string'
          ? fallbackCode
          : `HTTP_${response.status}`,
    message,
    details: problem?.details ?? null,
    requestId:
      (typeof problem?.requestId === 'string' ? problem.requestId : null) ?? response.headers.get('x-request-id'),
    retryAfter: response.headers.get('retry-after'),
    payload,
  });
};

const persistResponseToken = (response: Response) => {
  if (typeof window === 'undefined') return;
  const token = response.headers.get('Token');
  if (token) window.localStorage.setItem('auth_token', token);
};

const parseEnvelope = <T>(payload: unknown, responseStatus: number, validate?: (value: unknown) => T): T => {
  if (
    !isRecord(payload) ||
    typeof payload.code !== 'number' ||
    typeof payload.message !== 'string' ||
    !Object.prototype.hasOwnProperty.call(payload, 'data')
  ) {
    throw new Error('Invalid API envelope');
  }
  const envelope = payload as ApiEnvelope<unknown>;
  if (envelope.code !== responseStatus) throw new Error('API envelope code does not match HTTP status');
  return validate ? validate(envelope.data) : (envelope.data as T);
};

const parseObject = <T>(value: unknown, label: string): T => {
  if (!isRecord(value)) throw new Error(`Invalid ${label}`);
  return value as T;
};

const parseCursorPage = <T>(value: unknown): CursorPage<T> => {
  const page = parseObject<Record<string, unknown>>(value, 'cursor page');
  const pageInfo = parseObject<Record<string, unknown>>(page.pageInfo, 'cursor pageInfo');
  if (
    !Array.isArray(page.items) ||
    !(pageInfo.nextCursor === null || typeof pageInfo.nextCursor === 'string') ||
    !(pageInfo.previousCursor === null || typeof pageInfo.previousCursor === 'string') ||
    typeof pageInfo.hasNext !== 'boolean' ||
    typeof pageInfo.hasPrevious !== 'boolean'
  ) {
    throw new Error('Invalid cursor page');
  }
  return value as CursorPage<T>;
};

const parseBootstrap = (value: unknown): WorkspaceBootstrap => {
  const bootstrap = parseObject<Record<string, unknown>>(value, 'workspace bootstrap');
  const arrayKeys = ['inbox', 'activities', 'projects', 'repositories', 'agents', 'computers', 'conversations'];
  if (
    typeof bootstrap.generatedAt !== 'string' ||
    typeof bootstrap.eventCursor !== 'string' ||
    !isRecord(bootstrap.settings) ||
    arrayKeys.some((key) => !Array.isArray(bootstrap[key]))
  ) {
    throw new Error('Invalid workspace bootstrap');
  }
  return value as WorkspaceBootstrap;
};

const parseReceipt = <T>(value: unknown): CommandReceipt<T> => {
  const receipt = parseObject<Record<string, unknown>>(value, 'command receipt');
  if (
    typeof receipt.commandId !== 'string' ||
    typeof receipt.clientMutationId !== 'string' ||
    typeof receipt.eventCursor !== 'string' ||
    typeof receipt.replayed !== 'boolean' ||
    !Object.prototype.hasOwnProperty.call(receipt, 'resource')
  ) {
    throw new Error('Invalid command receipt');
  }
  return value as CommandReceipt<T>;
};

const parseEvent = (value: unknown): WorkspaceEventEnvelope => {
  const event = parseObject<Record<string, unknown>>(value, 'workspace event');
  if (
    typeof event.cursor !== 'string' ||
    typeof event.id !== 'string' ||
    typeof event.type !== 'string' ||
    typeof event.entityType !== 'string' ||
    typeof event.entityId !== 'string' ||
    typeof event.occurredAt !== 'string'
  ) {
    throw new Error('Invalid workspace event');
  }
  return value as WorkspaceEventEnvelope;
};

const request = async <T>(path: string, init: RequestInit = {}, validate?: (value: unknown) => T): Promise<T> => {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  Object.entries(authHeaders()).forEach(([key, value]) => headers.set(key, value));
  if (init.body) headers.set('Content-Type', 'application/json');
  if (init.method && init.method !== 'GET') {
    Object.entries(csrfHeaders()).forEach(([key, value]) => headers.set(key, value));
  }
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  persistResponseToken(response);
  if (!response.ok) throw await responseError(response);
  const payload = await parseJson(response);
  return parseEnvelope<T>(payload, response.status, validate);
};

type SseFrame = {
  id: string | null;
  event: string;
  retry: number | null;
  data: string;
};

const consumeSseBlock = (block: string): SseFrame => {
  let id: string | null = null;
  let event = 'message';
  let retry: number | null = null;
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('id:')) id = line.slice(3).trim();
    else if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('retry:')) {
      const value = Number.parseInt(line.slice(6).trim(), 10);
      if (Number.isFinite(value) && value >= 0) retry = value;
    } else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
  }
  return { id, event, retry, data: data.join('\n') };
};

const encodeId = (id: EntityId) => encodeURIComponent(id);

const withQuery = (path: string, values: Record<string, string | number | undefined>) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

export const createHttpAgentWorkspaceClient = (): AgentWorkspaceClient => {
  const listeners = new Set<WorkspaceListener>();
  let streamAbort: AbortController | null = null;
  let eventCursor = '';
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryAttempt = 0;
  let serverRetryMs: number | null = null;
  let bootstrapReady = false;
  let authBlocked = false;
  let connectionState: WorkspaceConnectionState = 'idle';

  const notify = (signal: Parameters<WorkspaceListener>[0]) => listeners.forEach((listener) => listener(signal));

  const setConnectionState = (state: WorkspaceConnectionState) => {
    if (connectionState === state) return;
    connectionState = state;
    notify({ source: 'connection', state });
  };

  const scheduleReconnect = (connect: () => void) => {
    if (listeners.size === 0 || !bootstrapReady || authBlocked || retryTimer) return;
    const exponential = Math.min(1_000 * 2 ** retryAttempt, 30_000);
    const baseDelay = serverRetryMs ?? exponential;
    const retryDelay = Math.max(250, Math.round(baseDelay * (0.8 + Math.random() * 0.4)));
    retryAttempt += 1;
    setConnectionState(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'reconnecting');
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, retryDelay);
  };

  const connectEventStream = async () => {
    if (typeof window === 'undefined' || streamAbort || listeners.size === 0 || !bootstrapReady || authBlocked) {
      return;
    }
    if (!navigator.onLine) {
      scheduleReconnect(() => void connectEventStream());
      return;
    }
    const controller = new AbortController();
    streamAbort = controller;
    setConnectionState(retryAttempt > 0 ? 'reconnecting' : 'connecting');
    try {
      const path = withQuery('/v1/agent-workspace/events/stream', {
        after: eventCursor || undefined,
      });
      const headers = new Headers({
        Accept: 'text/event-stream',
        ...authHeaders(),
      });
      if (eventCursor) headers.set('Last-Event-ID', eventCursor);
      const response = await fetch(`${apiBase}${path}`, {
        credentials: 'include',
        headers,
        signal: controller.signal,
      });
      persistResponseToken(response);
      if (!response.ok) throw await responseError(response);
      if (!response.body) throw new Error('Event stream body is unavailable');
      retryAttempt = 0;
      setConnectionState('connected');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const consumeFrame = (block: string) => {
        const frame = consumeSseBlock(block);
        if (frame.retry !== null) serverRetryMs = Math.min(frame.retry, 30_000);
        if (!frame.data || frame.event === 'heartbeat') return;
        const parsed = parseEvent(JSON.parse(frame.data) as unknown);
        if (frame.id && parsed.cursor !== frame.id) {
          throw new Error('SSE cursor does not match event id');
        }
        eventCursor = frame.id ?? parsed.cursor;
        notify({ source: 'stream', event: parsed });
      };

      while (!controller.signal.aborted) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done });
        const blocks = buffer.split(/\r?\n\r?\n/);
        buffer = blocks.pop() || '';
        blocks.forEach(consumeFrame);
        if (chunk.done) {
          if (buffer.trim()) consumeFrame(buffer);
          break;
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof AgentWorkspaceApiError && (error.status === 401 || error.status === 403)) {
          authBlocked = true;
          setConnectionState('auth_failed');
        } else if (error instanceof AgentWorkspaceApiError && error.status === 410) {
          bootstrapReady = false;
          eventCursor = '';
          notify({ source: 'resync', reason: error.code });
          setConnectionState('reconnecting');
        } else {
          if (error instanceof AgentWorkspaceApiError && error.status === 429) {
            const retrySeconds = Number(error.retryAfter);
            if (Number.isFinite(retrySeconds) && retrySeconds >= 0) {
              serverRetryMs = Math.min(retrySeconds * 1_000, 30_000);
            }
          }
          console.warn('[agent-workspace] event stream disconnected', error);
        }
      }
    } finally {
      if (streamAbort === controller) streamAbort = null;
      if (!controller.signal.aborted && !authBlocked) {
        scheduleReconnect(() => void connectEventStream());
      }
    }
  };

  const command = async <TResource>(
    method: 'POST' | 'PATCH' | 'DELETE',
    path: string,
    input: MutationInput,
  ): Promise<CommandReceipt<TResource>> => {
    const receipt = await request<CommandReceipt<TResource>>(
      path,
      {
        method,
        headers: { 'Idempotency-Key': input.clientMutationId },
        body: JSON.stringify(input),
      },
      parseReceipt<TResource>,
    );
    if (receipt.eventCursor) eventCursor = receipt.eventCursor;
    notify({ source: 'mutation', receipt });
    return receipt;
  };

  const list = <T>(path: string, query: CursorQuery = {}, signal?: AbortSignal) =>
    request<CursorPage<T>>(
      withQuery(path, {
        cursor: query.cursor,
        before: query.before,
        after: query.after,
        limit: query.limit,
      }),
      { signal },
      parseCursorPage<T>,
    );

  const listProjectResources = <T>(
    projectId: EntityId,
    resource: string,
    query: ProjectListQuery = {},
    signal?: AbortSignal,
  ) =>
    request<CursorPage<T>>(
      withQuery(`/v1/agent-workspace/projects/${encodeId(projectId)}/${resource}`, {
        cursor: query.cursor,
        limit: query.limit,
        status: query.status,
      }),
      { signal },
      parseCursorPage<T>,
    );

  return {
    getConnectionState: () => connectionState,
    async getBootstrap(signal) {
      const bootstrap = await request<WorkspaceBootstrap>('/v1/agent-workspace/bootstrap', { signal }, parseBootstrap);
      eventCursor = bootstrap.eventCursor;
      bootstrapReady = true;
      authBlocked = false;
      void connectEventStream();
      return bootstrap;
    },
    listInbox: (query, signal) => list<InboxItem>('/v1/agent-workspace/inbox', query, signal),
    listActivity: (query, signal) => list<ActivityEvent>('/v1/agent-workspace/activity', query, signal),
    getProjectOverview: (projectId, signal) =>
      request<ProjectOverview>(`/v1/agent-workspace/projects/${encodeId(projectId)}`, { signal }, (value) =>
        parseObject<ProjectOverview>(value, 'project overview'),
      ),
    listMessages: (projectId, conversationId, query, signal) =>
      list<Message>(
        `/v1/agent-workspace/projects/${encodeId(projectId)}/conversations/${encodeId(conversationId)}/messages`,
        query,
        signal,
      ),
    listTasks: (projectId, query, signal) => listProjectResources<Task>(projectId, 'tasks', query, signal),
    getTask: (taskId, signal) =>
      request<TaskDetail>(`/v1/agent-workspace/tasks/${encodeId(taskId)}`, { signal }, (value) =>
        parseObject<TaskDetail>(value, 'task detail'),
      ),
    listRuns: (projectId, query, signal) => listProjectResources<Run>(projectId, 'runs', query, signal),
    getRun: (runId, signal) =>
      request<RunDetail>(`/v1/agent-workspace/runs/${encodeId(runId)}`, { signal }, (value) =>
        parseObject<RunDetail>(value, 'run detail'),
      ),
    listRunEvents: (runId, query, signal) =>
      list<RunEvent>(`/v1/agent-workspace/runs/${encodeId(runId)}/events`, query, signal),
    listChangeSets: (projectId, query, signal) =>
      listProjectResources<ChangeSet>(projectId, 'change-sets', query, signal),
    getChangeSet: (changeSetId, signal) =>
      request<ChangeSetDetail>(`/v1/agent-workspace/change-sets/${encodeId(changeSetId)}`, { signal }, (value) =>
        parseObject<ChangeSetDetail>(value, 'change set detail'),
      ),
    getDelivery: (deliveryId, signal) =>
      request<Delivery>(`/v1/agent-workspace/deliveries/${encodeId(deliveryId)}`, { signal }, (value) =>
        parseObject<Delivery>(value, 'delivery'),
      ),
    listMemories: (projectId, query, signal) =>
      list<MemoryEntry>(`/v1/agent-workspace/projects/${encodeId(projectId)}/memories`, query, signal),
    listAutomations: (projectId, query, signal) =>
      list<Automation>(`/v1/agent-workspace/projects/${encodeId(projectId)}/automations`, query, signal),
    getEvents: (after, limit, signal) =>
      list<WorkspaceEventEnvelope>('/v1/agent-workspace/events', { after, limit }, signal),
    getAttachment: (id, signal) =>
      request<Attachment>(`/v1/agent-workspace/attachments/${encodeId(id)}`, { signal }, (value) =>
        parseObject<Attachment>(value, 'attachment'),
      ),
    getAttachmentDownload: (id, signal) =>
      request<PrivateDownloadGrant>(`/v1/agent-workspace/attachments/${encodeId(id)}/download`, { signal }, (value) =>
        parseObject<PrivateDownloadGrant>(value, 'attachment download grant'),
      ),
    getArtifact: (id, signal) =>
      request<Artifact>(`/v1/agent-workspace/artifacts/${encodeId(id)}`, { signal }, (value) =>
        parseObject<Artifact>(value, 'artifact'),
      ),
    getArtifactDownload: (id, signal) =>
      request<PrivateDownloadGrant>(`/v1/agent-workspace/artifacts/${encodeId(id)}/download`, { signal }, (value) =>
        parseObject<PrivateDownloadGrant>(value, 'artifact download grant'),
      ),
    subscribe(listener) {
      listeners.add(listener);
      listener({ source: 'connection', state: connectionState });
      void connectEventStream();
      return () => {
        listeners.delete(listener);
        if (listeners.size > 0) return;
        streamAbort?.abort();
        streamAbort = null;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = null;
        setConnectionState('idle');
      };
    },
    createProject: (input: CreateProjectInput) => command<ResourceRef>('POST', '/v1/agent-workspace/projects', input),
    updateProject: (id, input: UpdateProjectInput) =>
      command<ResourceRef>('PATCH', `/v1/agent-workspace/projects/${encodeId(id)}`, input),
    archiveProject: (id, input: VersionedMutationInput) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/projects/${encodeId(id)}/archive`, input),
    createRepository: (input: CreateRepositoryInput) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/projects/${encodeId(input.projectId)}/repositories`, input),
    updateRepository: (id, input: UpdateRepositoryInput) =>
      command<ResourceRef>('PATCH', `/v1/agent-workspace/repositories/${encodeId(id)}`, input),
    removeRepository: (id, input: VersionedMutationInput) =>
      command<ResourceRef>('DELETE', `/v1/agent-workspace/repositories/${encodeId(id)}`, input),
    refreshRepository: (id, input: VersionedMutationInput) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/repositories/${encodeId(id)}/refresh`, input),
    createAgent: (input: CreateAgentInput) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/projects/${encodeId(input.projectId)}/agents`, input),
    updateAgent: (id, input: UpdateAgentInput) =>
      command<ResourceRef>('PATCH', `/v1/agent-workspace/agents/${encodeId(id)}`, input),
    setAgentEnabled: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/agents/${encodeId(id)}/enabled`, input),
    restartAgent: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/agents/${encodeId(id)}/restart`, input),
    resetAgentSession: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/agents/${encodeId(id)}/session/reset`, input),
    fullResetAgent: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/agents/${encodeId(id)}/reset`, input),
    markInboxRead: (id, input) => command<ResourceRef>('POST', `/v1/agent-workspace/inbox/${encodeId(id)}/read`, input),
    markAllInboxRead: (input) => command<ResourceRef | null>('POST', '/v1/agent-workspace/inbox/read-all', input),
    sendMessage: (input: SendMessageInput) =>
      command<SendMessageResult>(
        'POST',
        `/v1/agent-workspace/projects/${encodeId(input.projectId)}/conversations/${encodeId(
          input.conversationId,
        )}/messages`,
        input,
      ),
    createTaskFromMessage: (messageId, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/messages/${encodeId(messageId)}/task`, input),
    updateTask: (taskId, input: UpdateTaskInput) =>
      command<ResourceRef>('PATCH', `/v1/agent-workspace/tasks/${encodeId(taskId)}`, input),
    startRun: (input: StartRunInput) => command<ResourceRef>('POST', '/v1/agent-workspace/runs', input),
    cancelRun: (runId, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/runs/${encodeId(runId)}/cancel`, input),
    retryRun: (runId, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/runs/${encodeId(runId)}/retry`, input),
    replyToRunInput: (input: ReplyToRunInput) =>
      command<ResourceRef>(
        'POST',
        `/v1/agent-workspace/runs/${encodeId(input.runId)}/input-requests/${encodeId(input.inputRequestId)}/reply`,
        input,
      ),
    approveChangeSet: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/change-sets/${encodeId(id)}/approve`, input),
    rejectChangeSet: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/change-sets/${encodeId(id)}/reject`, input),
    createDelivery: (input: CreateDeliveryInput) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/change-sets/${encodeId(input.changeSetId)}/deliveries`, input),
    retryDelivery: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/deliveries/${encodeId(id)}/retry`, input),
    reconcileDelivery: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/deliveries/${encodeId(id)}/reconcile`, input),
    createAutomation: (input: CreateAutomationInput) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/projects/${encodeId(input.projectId)}/automations`, input),
    updateAutomation: (id, input: UpdateAutomationInput) =>
      command<ResourceRef>('PATCH', `/v1/agent-workspace/automations/${encodeId(id)}`, input),
    deleteAutomation: (id, input) =>
      command<ResourceRef>('DELETE', `/v1/agent-workspace/automations/${encodeId(id)}`, input),
    setAutomationEnabled: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/automations/${encodeId(id)}/enabled`, input),
    runAutomationNow: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/automations/${encodeId(id)}/run`, input),
    addMemory: (input: CreateMemoryInput) => command<ResourceRef>('POST', '/v1/agent-workspace/memories', input),
    setMemoryPinned: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/memories/${encodeId(id)}/pinned`, input),
    deleteMemory: (id, input) => command<ResourceRef>('DELETE', `/v1/agent-workspace/memories/${encodeId(id)}`, input),
    setComputerDraining: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/computers/${encodeId(id)}/drain`, input),
    pairComputer: (input) => command<ComputerPairing>('POST', '/v1/agent-workspace/computers/pairings', input),
    revokeComputer: (id, input) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/computers/${encodeId(id)}/revoke`, input),
    createAttachmentUpload: (input: CreateAttachmentUploadInput) =>
      command<AttachmentUploadGrant>('POST', '/v1/agent-workspace/attachments/upload-intents', input),
    completeAttachmentUpload: (id, input: CompleteAttachmentUploadInput) =>
      command<ResourceRef>('POST', `/v1/agent-workspace/attachments/${encodeId(id)}/complete`, input),
    deleteAttachment: (id, input) =>
      command<ResourceRef>('DELETE', `/v1/agent-workspace/attachments/${encodeId(id)}`, input),
    search: (query, page, signal) =>
      request<CursorPage<SearchResult>>(
        withQuery('/v1/agent-workspace/search', {
          q: query,
          cursor: page?.cursor,
          limit: page?.limit,
        }),
        { signal },
        parseCursorPage<SearchResult>,
      ),
    updateSettings: (input: Partial<Omit<WorkspaceSettings, 'version'>> & VersionedMutationInput) =>
      command<ResourceRef>('PATCH', '/v1/agent-workspace/settings', input),
  };
};
