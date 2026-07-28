import client from '../db-ops/http/client';

export type KnowledgeChunkingConfig = {
  chunkMode: 'recursive' | 'paragraph';
  maxCharacters: number;
  overlap: number;
  separator: string;
  removeExtraSpaces: boolean;
  removeUrlsEmails: boolean;
};

export type KnowledgeRetrievalConfig = {
  retrievalMode: 'vector' | 'keyword' | 'hybrid';
  topK: number;
  scoreThreshold: number;
  semanticWeight: number;
  keywordWeight: number;
  rerankEnabled: boolean;
  rerankModel: string;
};

export type KnowledgeBaseConfig = KnowledgeChunkingConfig & KnowledgeRetrievalConfig;

export type KnowledgeBaseStats = {
  documentCount: number;
  chunkCount: number;
  readyCount: number;
  processingCount: number;
  failedCount: number;
  characterCount: number;
};

export type KnowledgeBase = {
  id: string;
  name: string;
  description?: string | null;
  config: KnowledgeBaseConfig;
  stats: KnowledgeBaseStats;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeDocument = {
  id: string;
  knowledgeBaseId: string;
  title: string;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  sourceType: 'manual' | 'file';
  content?: string | null;
  enabled: boolean;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  progress: number;
  error?: string | null;
  chunkCount: number;
  characterCount: number;
  embeddingStatus: 'not_configured' | 'ready' | 'failed';
  embeddingModel?: string | null;
  indexedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeChunk = {
  id: string;
  knowledgeBaseId: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  content: string;
  enabled: boolean;
  charStart: number;
  charEnd: number;
  estimatedTokens: number;
  keywords?: string[] | null;
  embeddingModel?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSearchRequest = Partial<KnowledgeRetrievalConfig> & {
  query: string;
};

export type KnowledgeSearchResult = {
  citation: string;
  knowledgeBaseId: string;
  documentId: string;
  documentTitle: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
  vectorScore?: number | null;
  keywordScore?: number | null;
  rerankScore?: number | null;
  content: string;
};

export type BatchDocumentAction = 'enable' | 'disable' | 'reindex' | 'delete';

export type KnowledgeImportCapabilities = {
  maxFiles: number;
  maxFileSizeBytes: number;
  maxRequestSizeBytes: number;
  acceptedExtensions: string[];
  acceptedMimeTypes: string[];
};

const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in payload) return (payload as { data: T }).data;
  return payload as T;
};

const get = async <T>(path: string) => unwrap<T>(await client(path, undefined, { method: 'GET' }));
const post = async <T>(path: string, body?: unknown) => unwrap<T>(await client(path, body, { method: 'POST' }));
const patch = async <T>(path: string, body: unknown) => unwrap<T>(await client(path, body, { method: 'PATCH' }));
const remove = async <T>(path: string) => unwrap<T>(await client(path, undefined, { method: 'DELETE' }));

export const knowledgeApi = {
  list: () => get<KnowledgeBase[]>('/ai/knowledge-bases'),
  importCapabilities: () => get<KnowledgeImportCapabilities>('/ai/knowledge-bases/import-capabilities'),
  get: (id: string) => get<KnowledgeBase>(`/ai/knowledge-bases/${id}`),
  create: (body: { name: string; description?: string; config: KnowledgeBaseConfig }) =>
    post<KnowledgeBase>('/ai/knowledge-bases', body),
  update: (id: string, body: { name?: string; description?: string; config?: KnowledgeBaseConfig }) =>
    patch<KnowledgeBase>(`/ai/knowledge-bases/${id}`, body),
  remove: (id: string) => remove<{ success: boolean }>(`/ai/knowledge-bases/${id}`),
  documents: (id: string) => get<KnowledgeDocument[]>(`/ai/knowledge-bases/${id}/documents`),
  importFiles: (id: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file, file.name));
    return post<{ documents: KnowledgeDocument[] }>(`/ai/knowledge-bases/${id}/documents/import`, form);
  },
  createText: (id: string, body: { title: string; content: string }) =>
    post<KnowledgeDocument>(`/ai/knowledge-bases/${id}/documents`, body),
  updateDocument: (id: string, documentId: string, body: { title?: string; content?: string; enabled?: boolean }) =>
    patch<KnowledgeDocument>(`/ai/knowledge-bases/${id}/documents/${documentId}`, body),
  removeDocument: (id: string, documentId: string) =>
    remove<{ success: boolean }>(`/ai/knowledge-bases/${id}/documents/${documentId}`),
  batchDocuments: (id: string, documentIds: string[], action: BatchDocumentAction) =>
    post<{ documents: KnowledgeDocument[]; success: boolean }>(`/ai/knowledge-bases/${id}/documents/batch`, {
      documentIds,
      action,
    }),
  chunks: (id: string, documentId: string) =>
    get<KnowledgeChunk[]>(`/ai/knowledge-bases/${id}/documents/${documentId}/chunks`),
  updateChunk: (id: string, documentId: string, chunkId: string, body: { content?: string; enabled?: boolean }) =>
    patch<KnowledgeChunk>(`/ai/knowledge-bases/${id}/documents/${documentId}/chunks/${chunkId}`, body),
  search: (id: string, body: KnowledgeSearchRequest) =>
    post<KnowledgeSearchResult[]>(`/ai/knowledge-bases/${id}/search`, body),
};
