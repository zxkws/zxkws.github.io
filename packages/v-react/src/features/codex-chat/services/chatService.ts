import type { ChatRequest, ChatResponse, ToolCall } from '../types';

const TOOL_STATUS_SET = new Set(['pending', 'streaming', 'completed', 'error']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const normalizeToolCall = (value: unknown): ToolCall | null => {
  if (!isRecord(value)) {
    return null;
  }
  const { id, type, input, output, createdAt } = value;
  if (
    typeof id !== 'string' ||
    typeof type !== 'string' ||
    typeof input !== 'string' ||
    typeof createdAt !== 'string'
  ) {
    return null;
  }
  if (!['code_interpreter', 'file_search', 'web_browsing', 'custom'].includes(type)) {
    return null;
  }
  return {
    id,
    type: type as ToolCall['type'],
    input,
    output: typeof output === 'string' ? output : undefined,
    createdAt,
  };
};

const normalizeResponse = (data: unknown): ChatResponse => {
  if (!isRecord(data) || !isRecord(data.message) || typeof data.message.content !== 'string') {
    throw new ChatServiceError('INVALID_RESPONSE', '响应结构与预期不符。', {
      friendlyMessage: '服务端返回的结构不符合协议，请参阅微应用内的开发文档完成实现。',
    });
  }

  const messageRecord = data.message as Record<string, unknown> & { content: string };
  const normalized: ChatResponse = {
    message: {
      content: messageRecord.content,
    },
  };

  if (Array.isArray(messageRecord.toolCalls)) {
    normalized.message.toolCalls = messageRecord.toolCalls
      .map(normalizeToolCall)
      .filter((item): item is ToolCall => Boolean(item));
  }

  if (typeof messageRecord.status === 'string' && TOOL_STATUS_SET.has(messageRecord.status)) {
    normalized.message.status = messageRecord.status as ChatResponse['message']['status'];
  }

  if (isRecord(data.usage)) {
    const usageRecord = data.usage;
    normalized.usage = {
      promptTokens: typeof usageRecord.promptTokens === 'number' ? usageRecord.promptTokens : undefined,
      completionTokens: typeof usageRecord.completionTokens === 'number' ? usageRecord.completionTokens : undefined,
      totalTokens: typeof usageRecord.totalTokens === 'number' ? usageRecord.totalTokens : undefined,
    };
  }

  if (typeof data.latencyMs === 'number') {
    normalized.latencyMs = data.latencyMs;
  }

  if (typeof data.cached === 'boolean') {
    normalized.cached = data.cached;
  }

  return normalized;
};

export class ChatServiceError extends Error {
  readonly code: 'HTTP_ERROR' | 'NETWORK_ERROR' | 'INVALID_RESPONSE' | 'SERVICE_UNAVAILABLE' | 'UNEXPECTED';
  readonly status?: number;
  readonly friendlyMessage: string;

  constructor(
    code: ChatServiceError['code'],
    message: string,
    options: { status?: number; friendlyMessage?: string; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ChatServiceError';
    this.code = code;
    this.status = options.status;
    this.friendlyMessage = options.friendlyMessage ?? message;
    if (Object.prototype.hasOwnProperty.call(options, 'cause')) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

type RequestOptions = {
  signal?: AbortSignal;
};

type StreamHandlers = {
  onMeta?: (_data: unknown) => void;
  onDelta?: (_delta: string) => void;
  onDone?: (_data: unknown) => void;
  onError?: (_message: string) => void;
};

const resolveApiBase = () => {
  if (typeof window !== 'undefined') {
    const runtimeConfig = (
      window as typeof window & {
        __CODEX_CHAT_CONFIG__?: { apiBaseUrl?: string };
      }
    ).__CODEX_CHAT_CONFIG__;
    if (runtimeConfig?.apiBaseUrl) {
      return runtimeConfig.apiBaseUrl.replace(/\/$/, '');
    }
  }
  if (import.meta.env.VITE_CODEX_CHAT_API_BASE) {
    return String(import.meta.env.VITE_CODEX_CHAT_API_BASE).replace(/\/$/, '');
  }
  return '';
};

const buildEndpoint = () => {
  const base = resolveApiBase();
  if (!base) {
    return '/api/codex/chat';
  }
  return `${base}/chat`;
};

const buildStreamEndpoint = () => {
  const base = resolveApiBase();
  if (!base) {
    return '/api/codex/chat/stream';
  }
  return `${base}/chat/stream`;
};

const isLikelySse = (contentType: string | null) => Boolean(contentType && contentType.includes('text/event-stream'));

const parseSseBlock = (block: string) => {
  const lines = block.split('\n');
  let eventName = 'message';
  const dataLines: string[] = [];

  lines.forEach((line) => {
    const trimmed = line.trimEnd();
    if (!trimmed || trimmed.startsWith(':')) return;
    if (trimmed.startsWith('event:')) {
      eventName = trimmed.slice('event:'.length).trim() || 'message';
      return;
    }
    if (trimmed.startsWith('data:')) {
      dataLines.push(trimmed.slice('data:'.length).trimStart());
    }
  });

  const raw = dataLines.join('\n');
  const data = (() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  })();

  return { eventName, data };
};

export async function createChatCompletion(payload: ChatRequest, options: RequestOptions = {}): Promise<ChatResponse> {
  const endpoint = buildEndpoint();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  } catch (error) {
    throw new ChatServiceError('NETWORK_ERROR', '无法连接到对话服务。', {
      friendlyMessage: '暂时无法连接到对话服务，请确认服务端是否已部署并允许运行。',
      cause: error,
    });
  }

  if (response.status === 404 || response.status === 501) {
    throw new ChatServiceError('SERVICE_UNAVAILABLE', '服务端未实现对话接口。', {
      status: response.status,
      friendlyMessage: '未检测到可用的对话服务端，请按照 README 中的说明实现 /api/codex/chat 接口后重试。',
    });
  }

  if (!response.ok) {
    throw new ChatServiceError('HTTP_ERROR', `请求失败：${response.status}`, {
      status: response.status,
      friendlyMessage: '服务端返回了错误状态码，请稍后再试或检查日志。',
    });
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new ChatServiceError('INVALID_RESPONSE', '响应解析失败。', {
      friendlyMessage: '无法解析模型响应，请检查服务端返回的数据格式。',
      cause: error,
    });
  }

  return normalizeResponse(data);
}

export async function createChatCompletionStream(
  payload: ChatRequest,
  handlers: StreamHandlers,
  options: RequestOptions = {},
): Promise<void> {
  const endpoint = buildStreamEndpoint();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });
  } catch (error) {
    throw new ChatServiceError('NETWORK_ERROR', '无法连接到对话服务。', {
      friendlyMessage: '暂时无法连接到对话服务，请确认服务端是否已部署并允许运行。',
      cause: error,
    });
  }

  if (response.status === 404 || response.status === 501) {
    throw new ChatServiceError('SERVICE_UNAVAILABLE', '服务端未实现对话接口。', {
      status: response.status,
      friendlyMessage: '未检测到可用的对话服务端，请按照 README 中的说明实现 /api/codex/chat/stream 接口后重试。',
    });
  }

  if (!response.ok) {
    throw new ChatServiceError('HTTP_ERROR', `请求失败：${response.status}`, {
      status: response.status,
      friendlyMessage: '服务端返回了错误状态码，请稍后再试或检查日志。',
    });
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!isLikelySse(contentType)) {
    throw new ChatServiceError('INVALID_RESPONSE', '响应类型与预期不符（非 SSE）。', {
      friendlyMessage: '服务端未返回 SSE 流，请检查接口实现。',
    });
  }

  if (!response.body) {
    throw new ChatServiceError('INVALID_RESPONSE', '响应缺少 body 流。', {
      friendlyMessage: '服务端未返回可读取的响应体，请检查部署与代理配置。',
    });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      // eslint-disable-next-line no-cond-assign
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!block) continue;

        const { eventName, data } = parseSseBlock(block);

        if (eventName === 'meta') {
          handlers.onMeta?.(data);
          continue;
        }

        if (eventName === 'delta') {
          const deltaText =
            typeof data === 'string'
              ? data
              : typeof (data as Record<string, unknown> | null)?.content === 'string'
                ? String((data as Record<string, unknown>).content)
                : '';
          if (deltaText) {
            handlers.onDelta?.(deltaText);
          }
          continue;
        }

        if (eventName === 'done') {
          handlers.onDone?.(data);
          continue;
        }

        if (eventName === 'error') {
          const message =
            typeof data === 'string'
              ? data
              : typeof (data as Record<string, unknown> | null)?.message === 'string'
                ? String((data as Record<string, unknown>).message)
                : '服务端返回错误。';
          handlers.onError?.(message);
          continue;
        }
      }
    }
  } catch (error) {
    throw new ChatServiceError('NETWORK_ERROR', 'SSE 流读取失败。', {
      friendlyMessage: '流式生成连接中断，请检查网络或稍后重试。',
      cause: error,
    });
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}
