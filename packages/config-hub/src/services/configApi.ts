import { SystemConfigDoc } from '../types';

const API_BASE = import.meta.env.MODE === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api';

const withAuthHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const unwrap = async (res: Response) => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  return 'data' in data ? data.data : data;
};

export const fetchConfig = async (): Promise<SystemConfigDoc> => {
  const res = await fetch(`${API_BASE}/config-center/micro-apps`, {
    credentials: 'include',
  });
  const payload = await unwrap(res);
  return {
    microApps: payload.microApps ?? [],
    standaloneMenus: payload.standaloneMenus ?? [],
    version: payload.version ?? '1.0.0',
    metadata: payload.metadata ?? {},
    updatedAt: payload.uts ?? payload.updatedAt ?? new Date().toISOString(),
  };
};

export const saveConfig = async (doc: SystemConfigDoc) => {
  const res = await fetch(`${API_BASE}/config-center/micro-apps`, {
    method: 'POST',
    headers: withAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(doc),
  });
  return unwrap(res);
};
