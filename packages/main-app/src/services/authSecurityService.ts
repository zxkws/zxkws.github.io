import { type HttpMethod, resolveApiBase } from '@zxkws/shared-fetch';
import { client } from './httpClient';

export type OAuthProvider = 'github' | 'google' | 'wechat' | 'alipay';

export type AuthProviderStatus = {
  password: boolean;
  sms: boolean;
  github: boolean;
  google: boolean;
  wechat: boolean;
  alipay: boolean;
};

export type UserIdentity = {
  id: string;
  provider: OAuthProvider;
  subject: string;
  displayName?: string | null;
  email?: string | null;
  avatar?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoginAudit = {
  id: string;
  userId?: string | null;
  provider: string;
  status: 'success' | 'failed';
  ip?: string | null;
  userAgent?: string | null;
  reason?: string | null;
  createdAt: string;
};

const unwrap = <T>(payload: unknown): T =>
  (payload && typeof payload === 'object' && 'data' in payload ? (payload as { data: T }).data : payload) as T;

const request = async <T>(path: string, method: HttpMethod = 'GET', data?: unknown): Promise<T> => {
  const response = await client<unknown>(path, data ?? {}, { method });
  return unwrap<T>(response);
};

const apiBase = resolveApiBase({
  rawBase: process.env.API_BASE_URL,
  dev: process.env.NODE_ENV === 'development',
});

export const authSecurityService = {
  providers: () => request<AuthProviderStatus>('/auth/providers'),
  identities: () => request<UserIdentity[]>('/auth/identities'),
  audits: () => request<LoginAudit[]>('/auth/audits'),
  unbind: (id: string) => request<{ success: boolean }>(`/auth/identities/${id}`, 'DELETE'),
  bindingUrl: (provider: OAuthProvider) =>
    `${apiBase}/auth/bind/${provider}?redirect=${encodeURIComponent(window.location.href)}`,
};
