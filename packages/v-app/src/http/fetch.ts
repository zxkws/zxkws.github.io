import { getRouter } from '../router';

const BASE_URL = process.env.NODE_ENV === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  file?: boolean;
  headers?: Record<string, string>;
}

interface ApiResponse<T> {
  statusCode?: number;
  data: T;
}

const defaultErrorHandler = (error: unknown) => {
  console.error('[v-app] Request failed', error);
  throw error instanceof Error ? error : new Error(String(error));
};

const persistToken = (response: Response) => {
  const token = response.headers.get('Token');
  if (token) {
    localStorage.setItem('auth_token', token);
  }
};

const shouldRedirectToLogin = <T>(payload: ApiResponse<T>): boolean => payload.statusCode === 401;

const buildHeaders = (isFileUpload: boolean, extraHeaders?: Record<string, string>) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${localStorage.getItem('auth_token') ?? ''}`,
    ...extraHeaders,
  };

  if (!isFileUpload) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const serialiseBody = (params: unknown, isFileUpload: boolean): BodyInit | undefined => {
  if (params == null) {
    return undefined;
  }
  if (params instanceof FormData) {
    return params;
  }
  if (isFileUpload && params instanceof Blob) {
    return params;
  }
  if (typeof params === 'string') {
    return params;
  }
  return JSON.stringify(params);
};

export async function request<T = unknown>(url: string, params?: unknown, options: RequestOptions = {}): Promise<T> {
  const { method = 'POST', file: isFileUpload = false, headers } = options;
  const body = serialiseBody(params, isFileUpload);

  try {
    const response = await fetch(`${BASE_URL}${url}`, {
      method,
      credentials: 'include',
      body,
      headers: buildHeaders(isFileUpload, headers),
    });

    persistToken(response);

    const contentType = response.headers.get('Content-Type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = (await (isJson ? response.json() : response.text())) as unknown;

    if (!response.ok) {
      const router = getRouter();
      router?.push({ name: 'login' });
      throw new Error(`Request failed with status ${response.status}`);
    }

    if (typeof payload === 'object' && payload !== null && shouldRedirectToLogin(payload as ApiResponse<T>)) {
      const router = getRouter();
      router?.push({ name: 'login' });
      throw new Error('Authentication required');
    }

    if (typeof payload === 'object' && payload !== null && 'data' in payload) {
      return (payload as ApiResponse<T>).data;
    }

    return payload as T;
  } catch (error) {
    defaultErrorHandler(error);
    throw error;
  }
}

export default request;
