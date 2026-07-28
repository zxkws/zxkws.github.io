import type { HttpMethod } from '@zxkws/shared-fetch';
import { client } from './httpClient';

export type BlogDraftStatus = 'generating' | 'draft' | 'publishing' | 'published' | 'failed';

export type BlogDraft = {
  id: string;
  userId: string;
  topic: string;
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  tags: string[];
  content?: string | null;
  status: BlogDraftStatus;
  knowledgeBaseIds: string[];
  generationTrace: string[];
  targetPath?: string | null;
  githubCommitSha?: string | null;
  publishedUrl?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

const request = async <T>(path: string, method: HttpMethod = 'GET', data?: unknown): Promise<T> => {
  const response = await client<unknown>(path, data ?? {}, { method });
  return unwrap<T>(response);
};

export const blogStudioService = {
  list: () => request<BlogDraft[]>('/v1/blog-studio/drafts'),
  get: (id: string) => request<BlogDraft>(`/v1/blog-studio/drafts/${id}`),
  generate: (data: { topic: string; guidance?: string; tags?: string[]; knowledgeBaseIds?: string[] }) =>
    request<BlogDraft>('/v1/blog-studio/drafts/generate', 'POST', data),
  update: (
    id: string,
    data: {
      title?: string;
      slug?: string;
      excerpt?: string;
      tags?: string[];
      content?: string;
    },
  ) => request<BlogDraft>(`/v1/blog-studio/drafts/${id}`, 'PATCH', data),
  delete: (id: string) => request<{ success: boolean }>(`/v1/blog-studio/drafts/${id}`, 'DELETE'),
  publish: (id: string, overwrite = false) =>
    request<BlogDraft>(`/v1/blog-studio/drafts/${id}/publish`, 'POST', { overwrite }),
};
