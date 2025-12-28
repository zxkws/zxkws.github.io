import { createFetchClient, resolveApiBase, type FetchResponse } from '@zxkws/shared-fetch';
import { Note } from './store';

const BASE_URL = resolveApiBase({
  rawBase: import.meta.env.API_BASE_URL,
  dev: import.meta.env.DEV || import.meta.env.MODE === 'development',
});

const client = createFetchClient({
  baseURL: BASE_URL,
  getToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('auth_token')),
  persistToken: (token) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  },
  credentials: 'include',
  responseInterceptors: [
    {
      onFulfilled: (res: FetchResponse<unknown>) => {
        const payload = res.data as unknown;
        const data =
          payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)
            ? (payload as { data: unknown }).data
            : payload;
        return { ...res, data };
      },
    },
  ],
});

const request = async <T>(url: string, params?: unknown, method: 'GET' | 'POST' | 'PATCH' = 'GET') => {
  return client<T>(url, params, { method });
};

export const listNotes = async (): Promise<Note[]> => request<Note[]>('/v1/notes');

export const getNote = async (id: string): Promise<Note> => request<Note>(`/v1/notes/${id}`);

export const createNote = async (payload: Partial<Note>) => request<Note>('/v1/notes', payload, 'POST');

export const createDaily = async (date: string) => request<Note>('/v1/notes/daily', { date }, 'POST');

export const patchNote = async (id: string, payload: Partial<Note> & { version?: number }) =>
  request<Note>(`/v1/notes/${id}`, payload, 'PATCH');

export const deleteNote = async (id: string) => request(`/v1/notes/${id}/delete`, undefined, 'POST');

export type UploadRecord = {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  downloadToken: string;
  signedUrl?: string;
  createdAt?: string;
};

export const uploadFile = async (file: File): Promise<UploadRecord> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  return client<UploadRecord>('/v1/upload/file', formData, { method: 'POST', file: true });
};
