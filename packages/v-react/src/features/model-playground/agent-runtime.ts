import { resolveApiBase } from '@zxkws/shared-fetch';

export type AgentRunEvent = {
  id?: number;
  type: string;
  node?: string | null;
  level?: 'info' | 'warning' | 'error';
  message?: string | null;
  data?: Record<string, unknown> | null;
  createdAt?: string;
  [key: string]: unknown;
};

export type AgentRunResult = {
  id: string;
  output?: string | null;
  status: string;
  model?: string | null;
  channelName?: string | null;
  trace?: string[] | null;
  error?: string | null;
  [key: string]: unknown;
};

type StreamInput = {
  input: string;
  channelId: number;
  model: string;
  skillIds: string[];
  knowledgeBaseIds: string[];
  mcpServerIds: string[];
  approvedToolKeys: string[];
};

const apiBase = resolveApiBase({
  rawBase: import.meta.env.API_BASE_URL,
  dev: import.meta.env.DEV || import.meta.env.MODE === 'development',
});

const responseError = async (response: Response) => {
  const contentType = response.headers.get('Content-Type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  const candidate =
    payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>).message || (payload as Record<string, unknown>).error
      : payload;
  return new Error(typeof candidate === 'string' && candidate ? candidate : `请求失败，状态码 ${response.status}`);
};

export async function streamAgentRun(
  input: StreamInput,
  onEvent: (event: AgentRunEvent) => void,
  signal?: AbortSignal,
): Promise<AgentRunResult> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('auth_token');
  const response = await fetch(`${apiBase}/v1/agent/runs/stream`, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw await responseError(response);
  if (!response.body) throw new Error('浏览器未提供 Agent 事件流');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AgentRunResult | null = null;
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
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (!dataLines.length) return;
    const parsed = JSON.parse(dataLines.join('\n')) as AgentRunEvent & { run?: AgentRunResult };
    const event = { ...parsed, id: parsed.id ?? id, type: parsed.type || eventType };
    if (event.type === 'stream.result' && parsed.run) result = parsed.run;
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
}
