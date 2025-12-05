export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  file?: boolean;
  credentials?: RequestCredentials;
  raw?: boolean;
};

export type CreateClientOptions = {
  baseURL?: string;
  getToken?: () => string | null;
  persistToken?: (_token: string) => void;
  onUnauthorized?: () => void;
  defaultHeaders?: Record<string, string>;
  credentials?: RequestCredentials;
};

const appendQuery = (url: string, params?: Record<string, unknown>) => {
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    search.append(k, String(v));
  });
  return `${url}${url.includes('?') ? '&' : '?'}${search.toString()}`;
};

export const createFetchClient = (options: CreateClientOptions = {}) => {
  const {
    baseURL = '',
    getToken,
    persistToken,
    onUnauthorized,
    defaultHeaders = {},
    credentials = 'include',
  } = options;

  return async function request<T = unknown>(
    url: string,
    params?: unknown,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    const { method = 'POST', headers = {}, file = false, raw = false } = requestOptions;

    const resolvedUrl =
      method === 'GET' && params && typeof params === 'object' && !file
        ? appendQuery(`${baseURL}${url}`, params as Record<string, unknown>)
        : `${baseURL}${url}`;

    let body: BodyInit | undefined;
    if (method !== 'GET') {
      if (file && params instanceof FormData) {
        body = params;
      } else if (file && params instanceof Blob) {
        body = params;
      } else if (params instanceof FormData) {
        body = params;
      } else if (typeof params === 'string') {
        body = params;
      } else if (params !== undefined) {
        body = JSON.stringify(params);
      }
    }

    const token = getToken?.();
    const finalHeaders: Record<string, string> = {
      ...defaultHeaders,
      ...headers,
    };

    if (!file && !(body instanceof FormData)) {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] ?? 'application/json';
    }
    if (token) {
      finalHeaders['Authorization'] = finalHeaders['Authorization'] ?? `Bearer ${token}`;
    }

    const response = await fetch(resolvedUrl, {
      method,
      headers: finalHeaders,
      body,
      credentials: requestOptions.credentials ?? credentials,
    });

    const headerToken = response.headers.get('Token');
    if (headerToken && persistToken) {
      persistToken(headerToken);
    }

    if (!response.ok) {
      if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (raw) {
      // @ts-expect-error raw consumer responsible to read body
      return response as T;
    }

    const contentType = response.headers.get('Content-Type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = (await (isJson ? response.json() : response.text())) as unknown;
    return payload as T;
  };
};

export default createFetchClient;
