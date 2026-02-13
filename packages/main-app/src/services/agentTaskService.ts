import { client } from './httpClient';

export type AgentTaskCondition = {
  sourceType?: 'mcp' | 'tool' | 'static';
  toolId?: string;
  queryParams?: Record<string, unknown> | null;
  comparator: 'lt' | 'gt' | 'eq' | 'regex' | 'contains';
  thresholdValue?: string | null;
  joinLogic?: 'and' | 'or';
};

export type AgentTask = {
  id: string;
  title: string;
  status: 'draft' | 'running' | 'triggered' | 'expired' | 'failed';
  scheduleType: 'cron' | 'fixed' | 'event';
  scheduleValue?: string | null;
  timezone?: string | null;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  triggerCount?: number;
  conditions?: AgentTaskCondition[];
};

export type McpConnection = {
  id: string;
  name: string;
  serverUrl: string;
  tools?: unknown;
  credentials?: unknown;
  status?: string;
};

export const parseTaskByNl = (text: string) =>
  client<{ raw: string; parsed: unknown }>('/v1/agent-tasks/nl', { text }, { method: 'POST' });

export const createAgentTask = (payload: {
  title: string;
  intentRaw?: string;
  intentStruct?: Record<string, unknown> | null;
  scheduleType: 'cron' | 'fixed' | 'event';
  scheduleValue?: string;
  timezone?: string;
  expiresAt?: string;
  notifyChannel?: 'web_push' | 'email' | 'webhook';
  conditions: AgentTaskCondition[];
}) => client<AgentTask>('/v1/agent-tasks', payload, { method: 'POST' });

export const listAgentTasks = () => client<AgentTask[]>('/v1/agent-tasks', undefined, { method: 'GET' });

export const executeAgentTask = (id: string) => client(`/v1/agent-tasks/${id}/execute`, undefined, { method: 'POST' });

export const listMcpConnections = () => client<McpConnection[]>('/v1/mcp/connections', undefined, { method: 'GET' });

export const createMcpConnection = (payload: {
  name: string;
  serverUrl: string;
  tools?: Record<string, unknown> | unknown[] | null;
  credentials?: Record<string, unknown> | null;
  status?: string;
}) => client<McpConnection>('/v1/mcp/connections', payload, { method: 'POST' });

export const importMcpConnection = (payload: {
  configJson: string;
  nameOverride?: string;
  statusOverride?: string;
  serverName?: string;
}) => client<McpConnection>('/v1/mcp/connections/import', payload, { method: 'POST' });

export const updateMcpConnection = (
  id: string,
  payload: Partial<{
    name: string;
    serverUrl: string;
    tools: Record<string, unknown> | unknown[] | null;
    credentials: Record<string, unknown> | null;
    status: string;
  }>,
) => client<McpConnection>(`/v1/mcp/connections/${id}`, payload, { method: 'PATCH' });

export const deleteMcpConnection = (id: string) =>
  client<{ deleted: boolean }>(`/v1/mcp/connections/${id}`, undefined, { method: 'DELETE' });

export type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
  ua?: string;
};

export type AgentTaskEvent = {
  id: string;
  status: 'success' | 'fail' | 'skip';
  payload?: Record<string, unknown> | null;
  error?: string | null;
  createdAt: string;
};

export const listAgentTaskEvents = (id: string) =>
  client<AgentTaskEvent[]>(`/v1/agent-tasks/${id}/events`, undefined, { method: 'GET' });

export const fetchVapidPublicKey = async () => {
  const res = await client<{ publicKey: string | null; hint?: string }>('/v1/agent-tasks/push/public-key', undefined, {
    method: 'GET',
  });
  return res?.publicKey ?? null;
};

export const savePushSubscription = (payload: PushSubscriptionPayload) =>
  client('/v1/agent-tasks/push/subscriptions', payload, { method: 'POST' });

export const listPushSubscriptions = () =>
  client<PushSubscriptionPayload[]>('/v1/agent-tasks/push/subscriptions', undefined, { method: 'GET' });
