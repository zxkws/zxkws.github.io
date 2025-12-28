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
  tools?: Array<{ name?: string; description?: string; id?: string }>;
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

export type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
  ua?: string;
};

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
