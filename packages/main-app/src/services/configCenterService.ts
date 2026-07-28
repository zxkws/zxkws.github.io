import type { HttpMethod } from '@zxkws/shared-fetch';
import { client } from './httpClient';

export type ConfigVisibility = 'public' | 'token';
export type ConfigVersionStatus = 'draft' | 'published' | 'archived';

export type ConfigApplication = {
  id: string;
  key: string;
  environment: string;
  name: string;
  description?: string | null;
  visibility: ConfigVisibility;
  publishedVersionId?: string | null;
  publishedVersion?: number | null;
  createdAt: string;
  updatedAt: string;
  pullToken?: string;
};

export type ConfigVersion = {
  id: string;
  applicationId: string;
  version: number;
  status: ConfigVersionStatus;
  payload: Record<string, unknown>;
  checksum: string;
  changelog?: string | null;
  createdBy: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConfigRelease = {
  id: string;
  applicationId: string;
  versionId: string;
  version: number;
  action: 'publish' | 'rollback';
  createdBy: string;
  createdAt: string;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

const request = async <T>(path: string, method: HttpMethod = 'GET', data?: unknown): Promise<T> => {
  const response = await client<unknown>(path, data ?? {}, { method });
  return unwrap<T>(response);
};

export const configCenterService = {
  listApplications: () => request<ConfigApplication[]>('/v1/config-center/applications'),
  createApplication: (data: {
    key: string;
    environment: string;
    name: string;
    description?: string;
    visibility: ConfigVisibility;
  }) => request<ConfigApplication>('/v1/config-center/applications', 'POST', data),
  updateApplication: (id: string, data: Partial<Omit<ConfigApplication, 'id'>>) =>
    request<ConfigApplication>(`/v1/config-center/applications/${id}`, 'PATCH', data),
  deleteApplication: (id: string) => request<{ success: boolean }>(`/v1/config-center/applications/${id}`, 'DELETE'),
  rotateToken: (id: string) => request<{ pullToken: string }>(`/v1/config-center/applications/${id}/token`, 'POST'),
  listVersions: (applicationId: string) =>
    request<ConfigVersion[]>(`/v1/config-center/applications/${applicationId}/versions`),
  createVersion: (applicationId: string, data: { payload: Record<string, unknown>; changelog?: string }) =>
    request<ConfigVersion>(`/v1/config-center/applications/${applicationId}/versions`, 'POST', data),
  updateVersion: (id: string, data: { payload?: Record<string, unknown>; changelog?: string }) =>
    request<ConfigVersion>(`/v1/config-center/versions/${id}`, 'PATCH', data),
  deleteVersion: (id: string) => request<{ success: boolean }>(`/v1/config-center/versions/${id}`, 'DELETE'),
  publishVersion: (id: string) => request<ConfigVersion>(`/v1/config-center/versions/${id}/publish`, 'POST'),
  rollbackVersion: (id: string) => request<ConfigVersion>(`/v1/config-center/versions/${id}/rollback`, 'POST'),
  listReleases: (applicationId: string) =>
    request<ConfigRelease[]>(`/v1/config-center/applications/${applicationId}/releases`),
};
