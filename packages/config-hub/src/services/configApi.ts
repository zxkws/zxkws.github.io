const API_BASE = import.meta.env.MODE === 'development' ? '/api' : 'https://system.zxkws.nyc.mn/api';

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

export const fetchConfig = async (): Promise<Record<string, unknown>> => {
  const res = await fetch(`${API_BASE}/config-center/micro-apps`, {
    credentials: 'include',
  });
  const payload = await unwrap(res);
  return payload as Record<string, unknown>;
};

export const saveConfig = async (doc: Record<string, unknown>) => {
  const res = await fetch(`${API_BASE}/config-center/micro-apps`, {
    method: 'POST',
    headers: withAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(doc),
  });
  return unwrap(res);
};
