import { createFetchClient, type FetchResponse } from '@zxkws/shared-fetch';
import { Note } from './store';

const BASE_URL = import.meta.env.MODE === 'development' ? '/api' : 'https://system.zxkws.nyc.mn/api';

const client = createFetchClient({
  baseURL: BASE_URL,
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

export const listNotes = async (): Promise<Note[]> => request<Note[]>('/notes');

export const getNote = async (id: string): Promise<Note> => request<Note>(`/notes/${id}`);

export const createNote = async (payload: Partial<Note>) => request<Note>('/notes', payload, 'POST');

export const createDaily = async (date: string) => request<Note>('/notes/daily', { date }, 'POST');

export const patchNote = async (id: string, payload: Partial<Note> & { version?: number }) =>
  request<Note>(`/notes/${id}`, payload, 'PATCH');

export const deleteNote = async (id: string) => request(`/notes/${id}/delete`, undefined, 'POST');
