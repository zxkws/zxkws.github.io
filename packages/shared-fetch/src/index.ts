export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type FetchHttpError = Error & {
  status?: number;
  url?: string;
  method?: HttpMethod;
  payload?: unknown;
};

export const getErrorStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
};

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
  /**
   * Request interceptors run before fetch. Mutate and return config.
   */
  requestInterceptors?: Array<(_config: FetchRequestConfig) => FetchRequestConfig | Promise<FetchRequestConfig>>;
  /**
   * Response interceptors run after response parsing. Fulfills or throws to reject.
   */
  responseInterceptors?: Array<ResponseInterceptor>;
};

export type ResponseInterceptor = {
  onFulfilled?: (_value: FetchResponse<unknown>) => FetchResponse<unknown> | Promise<FetchResponse<unknown>>;
  onRejected?: (_error: unknown) => unknown | Promise<unknown>;
};

export type FetchRequestConfig = {
  url: string;
  params?: unknown;
  options: RequestOptions;
};

export type FetchResponse<T> = {
  response: Response;
  data: T;
};

export type ResolveApiBaseOptions = {
  rawBase?: string;
  dev?: boolean;
  hostname?: string;
  defaultBase?: string;
  zxkwsHost?: string;
};

export const resolveApiBase = (options: ResolveApiBaseOptions = {}): string => {
  const {
    rawBase,
    dev = false,
    hostname,
    defaultBase = '/api',
    zxkwsHost = 'zxkws.nyc.mn',
  } = options;

  const trimmedRaw = typeof rawBase === 'string' ? rawBase.trim() : '';
  const fallback = dev ? defaultBase : trimmedRaw || defaultBase;
  const host = hostname ?? (typeof window !== 'undefined' ? window.location.hostname : undefined);

  if (!host) return fallback;
  if (host === zxkwsHost) return defaultBase;
  return trimmedRaw || fallback;
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
    requestInterceptors = [],
    responseInterceptors = [],
  } = options;

  return async function request<T = unknown>(
    url: string,
    params?: unknown,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    const cfg: FetchRequestConfig = {
      url,
      params,
      options: {
        method: 'POST',
        headers: {},
        file: false,
        raw: false,
        ...requestOptions,
      },
    };

    try {
      // apply request interceptors in order
      let intercepted = cfg;
      for (const fn of requestInterceptors) {
        intercepted = await fn(intercepted);
      }

      const { method, headers, file, raw } = intercepted.options;
      params = intercepted.params;
      url = intercepted.url;

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

      const shouldSetJsonContentType = method !== 'GET' && body !== undefined && !file && !(body instanceof FormData);
      if (shouldSetJsonContentType) {
        finalHeaders['Content-Type'] = finalHeaders['Content-Type'] ?? 'application/json';
      }
      if (token) {
        finalHeaders['Authorization'] = finalHeaders['Authorization'] ?? `Bearer ${token}`;
      }

      const response = await fetch(resolvedUrl, {
        method,
        headers: finalHeaders,
        body,
        credentials: intercepted.options.credentials ?? credentials,
      });

      const headerToken = response.headers.get('Token');
      if (headerToken && persistToken) {
        persistToken(headerToken);
      }

      const contentType = response.headers.get('Content-Type') ?? '';
      const isJson = contentType.includes('application/json');
      const payload = (await (isJson ? response.json() : response.text())) as unknown;

      if (!response.ok) {
        if (response.status === 401 && onUnauthorized) {
          onUnauthorized();
        }
        const candidate =
          isJson && payload && typeof payload === 'object'
            ? (payload as Record<string, unknown>).message ||
              (payload as Record<string, unknown>).error ||
              (payload as Record<string, unknown>).msg
            : undefined;
        const messageText =
          typeof candidate === 'string' && candidate.trim() ? candidate : `请求失败，状态码 ${response.status}`;
        const error: FetchHttpError = new Error(messageText);
        error.status = response.status;
        error.url = resolvedUrl;
        error.method = method;
        error.payload = payload;
        throw error;
      }

      const result: FetchResponse<T> = {
        response,
        data: (raw ? (response as unknown) : payload) as T,
      };

      let transformed: FetchResponse<unknown> = result;
      let didTransform = false;
      for (const { onFulfilled } of responseInterceptors) {
        if (onFulfilled) {
          transformed = await onFulfilled(transformed);
          didTransform = true;
        }
      }

      return (didTransform ? transformed.data : result.data) as T;
    } catch (err) {
      // allow response interceptors to handle errors (inverse order like axios)
      let errorToHandle: unknown = err;
      for (let i = responseInterceptors.length - 1; i >= 0; i -= 1) {
        const handler = responseInterceptors[i]?.onRejected;
        if (handler) {
          try {
            const maybe = await handler(errorToHandle);
            if (maybe !== undefined) {
              if (typeof maybe === 'object' && maybe !== null && 'data' in maybe) {
                return (maybe as FetchResponse<unknown>).data as T;
              }
              return maybe as T;
            }
          } catch (e) {
            errorToHandle = e;
          }
        }
      }
      throw errorToHandle;
    }
  };
};
