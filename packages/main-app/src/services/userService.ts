import { client } from './httpClient';

export type UserProfile = {
  id?: string | number;
  username?: string;
  email?: string;
  role?: string; // 兼容旧字段
  roles?: string[];
  permissions?: string[];
};

let cachedProfile: UserProfile | null = null;
let inFlight: Promise<UserProfile | null> | null = null;
const USER_CACHE_KEY = 'main-app:user';

const sanitizeUser = (raw: unknown): UserProfile => {
  if (!raw || typeof raw !== 'object') return {};
  const { username, email, role, roles, permissions, id } = raw as Record<string, unknown>;
  return {
    id: typeof id === 'string' || typeof id === 'number' ? id : undefined,
    username: typeof username === 'string' ? username : undefined,
    email: typeof email === 'string' ? email : undefined,
    role: typeof role === 'string' ? role : undefined,
    roles: Array.isArray(roles) ? roles.filter((r) => typeof r === 'string') : undefined,
    permissions: Array.isArray(permissions) ? permissions.filter((p) => typeof p === 'string') : undefined,
  };
};

const persistUser = (profile: UserProfile | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (!profile) {
      window.localStorage.removeItem(USER_CACHE_KEY);
    } else {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
    }
  } catch {
    // ignore storage errors
  }
};

const emitUserChanged = (profile: UserProfile | null) => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('main-app:user-changed', { detail: profile }));
  } catch {
    // ignore
  }
};

export const setCachedUser = (profile: UserProfile | null) => {
  cachedProfile = profile ? sanitizeUser(profile) : null;
  inFlight = null;
  persistUser(cachedProfile);
  emitUserChanged(cachedProfile);
};

/**
 * Fetch current user once per page lifetime.
 * Ensures password / sensitive fields are dropped on the frontend.
 */
export const fetchCurrentUser = async (forceRefresh = false): Promise<UserProfile | null> => {
  if (cachedProfile && !forceRefresh) {
    return cachedProfile;
  }
  if (inFlight && !forceRefresh) {
    return inFlight;
  }

  inFlight = client('/v1/user', undefined, { method: 'GET' })
    .then((res: unknown) => {
      const data = res && typeof res === 'object' && 'data' in res ? (res as { data: unknown }).data : res;
      const safe = sanitizeUser(data);
      setCachedUser(safe);
      return cachedProfile;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const clearCachedUser = () => {
  cachedProfile = null;
  inFlight = null;
  persistUser(null);
  emitUserChanged(null);
};

/**
 * Update current user profile and keep local cache in sync.
 * This merges server response with cached profile to avoid losing fields.
 */
export const saveCurrentUser = async (
  payload: Partial<UserProfile> & { password?: string },
): Promise<UserProfile | null> => {
  const res = await client('/v1/user', payload, { method: 'PATCH' });
  const data =
    res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)
      ? (res as { data: unknown }).data
      : res;

  let mergedSource: Record<string, unknown> = { ...(cachedProfile ?? {}), ...payload };
  if (data && typeof data === 'object') {
    mergedSource = { ...mergedSource, ...(data as Record<string, unknown>) };
  }

  const merged = sanitizeUser(mergedSource);
  setCachedUser(merged);
  return merged;
};
