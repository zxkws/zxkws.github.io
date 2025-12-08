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
  client<{ raw: string; parsed: unknown }>('/agent-tasks/nl', { text }, { method: 'POST' });

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
}) => client<AgentTask>('/agent-tasks', payload, { method: 'POST' });

export const listAgentTasks = () => client<AgentTask[]>('/agent-tasks', undefined, { method: 'GET' });

export const executeAgentTask = (id: string) => client(`/agent-tasks/${id}/execute`, undefined, { method: 'POST' });

export const listMcpConnections = () => client<McpConnection[]>('/mcp/connections', undefined, { method: 'GET' });

export type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
  ua?: string;
};

export const savePushSubscription = (payload: PushSubscriptionPayload) =>
  client('/agent-tasks/push/subscriptions', payload, { method: 'POST' });

export const listPushSubscriptions = () =>
  client<PushSubscriptionPayload[]>('/agent-tasks/push/subscriptions', undefined, { method: 'GET' });
