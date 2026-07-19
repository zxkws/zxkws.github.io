import client from '../db-ops/http/client';

export type Assistant = {
  id: string;
  name: string;
  assistantName: string;
  userName: string;
  language: string;
  llmModel?: string | null;
  voiceId: string;
  voiceSource: string;
  character?: string | null;
  speechSpeed: string;
  recognitionSpeed: string;
  pitch: number;
  longMemoryEnabled: boolean;
  teenMode: boolean;
  maxMessageCount: number;
  knowledgeBaseIds?: string[] | null;
  extensionIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type Voice = { id: string; name: string; voiceSource: string; languages: string[] };
export type Model = { id: string };
export type Memory = { id: string; content: string; createdAt: string; updatedAt: string };
export type Conversation = { id: string; title?: string | null; createdAt: string; updatedAt: string };
export type Message = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };
export type KnowledgeBase = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};
export type KnowledgeDocument = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as { data: T }).data;
  return payload as T;
};

const get = async <T>(path: string) => unwrap<T>(await client(path, undefined, { method: 'GET' }));
const post = async <T>(path: string, body?: unknown) => unwrap<T>(await client(path, body, { method: 'POST' }));
const patch = async <T>(path: string, body: unknown) => unwrap<T>(await client(path, body, { method: 'PATCH' }));
const remove = async <T>(path: string) => unwrap<T>(await client(path, undefined, { method: 'DELETE' }));

export const assistantApi = {
  list: () => get<Assistant[]>('/ai/assistants'),
  create: (name: string) => post<Assistant>('/ai/assistants', { name }),
  update: (id: string, body: Partial<Assistant>) => patch<Assistant>(`/ai/assistants/${id}`, body),
  remove: (id: string) => remove<{ success: boolean }>(`/ai/assistants/${id}`),
  voices: () => get<Voice[]>('/ai/voices'),
  models: () => get<Model[]>('/ai/models'),
  memories: (id: string) => get<Memory[]>(`/ai/assistants/${id}/memories`),
  addMemory: (id: string, content: string) => post<Memory>(`/ai/assistants/${id}/memories`, { content }),
  removeMemory: (id: string, memoryId: string) =>
    remove<{ success: boolean }>(`/ai/assistants/${id}/memories/${memoryId}`),
  conversations: (id: string) => get<Conversation[]>(`/ai/assistants/${id}/conversations`),
  messages: (id: string, conversationId: string) =>
    get<Message[]>(`/ai/assistants/${id}/conversations/${conversationId}/messages`),
  chat: (id: string, content: string, conversationId?: string) =>
    post<{
      conversation: Conversation;
      userMessage: Message;
      assistantMessage: Message;
      model: string;
    }>(`/ai/assistants/${id}/chat`, { content, conversationId }),
  speech: (id: string, text: string) =>
    post<{ audioBase64: string; contentType: string }>(`/ai/assistants/${id}/speech`, { text }),
  transcribe: (id: string, recording: Blob) => {
    const form = new FormData();
    form.append('file', recording, `recording.${recording.type.includes('ogg') ? 'ogg' : 'webm'}`);
    return post<{ text: string }>(`/ai/assistants/${id}/transcribe`, form);
  },
};

export const knowledgeApi = {
  list: () => get<KnowledgeBase[]>('/ai/knowledge-bases'),
  create: (body: { name: string; description?: string }) => post<KnowledgeBase>('/ai/knowledge-bases', body),
  update: (id: string, body: { name?: string; description?: string }) =>
    patch<KnowledgeBase>(`/ai/knowledge-bases/${id}`, body),
  remove: (id: string) => remove<{ success: boolean }>(`/ai/knowledge-bases/${id}`),
  documents: (id: string) => get<KnowledgeDocument[]>(`/ai/knowledge-bases/${id}/documents`),
  createDocument: (id: string, body: { title: string; content: string }) =>
    post<KnowledgeDocument>(`/ai/knowledge-bases/${id}/documents`, body),
  updateDocument: (id: string, documentId: string, body: { title?: string; content?: string }) =>
    patch<KnowledgeDocument>(`/ai/knowledge-bases/${id}/documents/${documentId}`, body),
  removeDocument: (id: string, documentId: string) =>
    remove<{ success: boolean }>(`/ai/knowledge-bases/${id}/documents/${documentId}`),
};
