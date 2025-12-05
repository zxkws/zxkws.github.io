import { createFetchClient } from '@zxkws/shared-fetch';

export type UserProfile = {
  id?: string | number;
  username?: string;
  email?: string;
  role?: string;
};

const client = createFetchClient({
  baseURL: process.env.NODE_ENV === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api',
  getToken: () => (typeof window === 'undefined' ? null : localStorage.getItem('auth_token')),
  credentials: 'include',
});

let cachedProfile: UserProfile | null = null;
let inFlight: Promise<UserProfile | null> | null = null;

const sanitizeUser = (raw: any): UserProfile => {
  if (!raw || typeof raw !== 'object') return {};
  const { username, email, role, id } = raw as Record<string, unknown>;
  return {
    id: typeof id === 'string' || typeof id === 'number' ? id : undefined,
    username: typeof username === 'string' ? username : undefined,
    email: typeof email === 'string' ? email : undefined,
    role: typeof role === 'string' ? role : undefined,
  };
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
    .then((res: any) => {
      const data = res?.data ?? res;
      const safe = sanitizeUser(data);
      cachedProfile = safe;
      return safe;
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
};

export default fetchCurrentUser;
