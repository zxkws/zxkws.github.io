import { createFetchClient, resolveApiBase, type FetchResponse } from '@zxkws/shared-fetch';

export type Website = {
  id: string;
  name: string;
  url: string;
  intervalMinutes: number;
  enabled: boolean;
  lastVisitedAt: string | null;
  nextVisitAt: string | null;
  lastStatusCode: number | null;
  lastError: string | null;
};

export type WebsiteInput = Pick<Website, 'name' | 'url' | 'intervalMinutes' | 'enabled'>;

const client = createFetchClient({
  baseURL: resolveApiBase({
    rawBase: import.meta.env.API_BASE_URL,
    dev: import.meta.env.DEV || import.meta.env.MODE === 'development',
  }),
  getToken: () => localStorage.getItem('auth_token'),
  responseInterceptors: [
    {
      onFulfilled: (response: FetchResponse<unknown>) => {
        const payload = response.data;
        const data =
          payload && typeof payload === 'object' && 'data' in payload
            ? (payload as { data: unknown }).data
            : payload;
        return { ...response, data };
      },
    },
  ],
});

export const listWebsites = () => client<Website[]>('/v1/websites', undefined, { method: 'GET' });
export const createWebsite = (input: WebsiteInput) => client<Website>('/v1/websites', input, { method: 'POST' });
export const updateWebsite = (id: string, input: WebsiteInput) =>
  client<Website>(`/v1/websites/${id}`, input, { method: 'PATCH' });
export const deleteWebsite = (id: string) => client(`/v1/websites/${id}`, undefined, { method: 'DELETE' });
