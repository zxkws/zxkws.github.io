import type { HttpMethod } from '@zxkws/shared-fetch';
import { client } from './httpClient';

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
  status: 'pending' | 'running' | 'completed' | 'failed';
  skillIds?: string[] | null;
  knowledgeBaseIds?: string[] | null;
  mcpServerIds?: string[] | null;
  trace?: string[] | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type McpTestResult = {
  serverId: string;
  serverCode: string;
  tools: Array<{
    name: string;
    title?: string;
    description?: string;
    inputSchema: unknown;
    outputSchema?: unknown;
    annotations?: unknown;
  }>;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

const request = async <T>(path: string, method: HttpMethod = 'GET', data?: unknown): Promise<T> => {
  const response = await client<unknown>(path, data ?? {}, { method });
  return unwrap<T>(response);
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
  listRuns: () => request<AgentRun[]>('/v1/agent/runs'),
  run: (data: {
    input: string;
    threadId?: string;
    skillIds: string[];
    knowledgeBaseIds: string[];
    mcpServerIds: string[];
  }) => request<AgentRun>('/v1/agent/runs', 'POST', data),
};
