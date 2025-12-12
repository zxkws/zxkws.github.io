import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearCachedUser, fetchCurrentUser, saveCurrentUser, type UserProfile } from '../services/userService';

// 定义虚拟游客用户
export const GUEST_USER: UserProfile = {
  userId: 'guest-001',
  username: 'Guest',
  email: 'guest@example.com',
  role: 'guest',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
};

type UserContextValue = {
  user: UserProfile | null;
  loading: boolean;
  isGuest: boolean;
  /** 获取当前用户；force=true 时跳过缓存重新请求 */
  refreshUser: (opts?: { force?: boolean }) => Promise<UserProfile | null>;
  /** 调用后台保存并刷新本地缓存 */
  saveUser: (payload: Partial<UserProfile> & { password?: string }) => Promise<UserProfile | null>;
  /** 登出/清空时调用 */
  clearUser: () => void;
};

const UserContext = createContext<UserContextValue>({
  user: GUEST_USER, // 默认为游客
  loading: false,
  isGuest: true,
  refreshUser: async (_opts) => null,
  saveUser: async (_payload) => null,
  clearUser: () => undefined,
});

export const UserProvider = ({ children }: PropsWithChildren) => {
  // 默认就是 Guest，不需要等待 loading，直接可以渲染 UI
  const [user, setUser] = useState<UserProfile | null>(GUEST_USER);
  const [loading, setLoading] = useState(true);

  const isGuest = useMemo(() => !user || user.role === 'guest', [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (token) {
      try {
        window.localStorage.setItem('auth_token', token);
      } catch {
        // ignore
      }
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const clearUser = useCallback(() => {
    clearCachedUser();
    // 登出后，回退到 Guest，而不是 null
    setUser(GUEST_USER);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    setLoading(true);
    try {
      // 尝试获取用户信息
      const profile = await fetchCurrentUser(force);
      if (profile) {
        setUser(profile);
        return profile;
      }
      // 如果后端返回空或没有 Token，则静默失败，维持 Guest 状态
      setUser(GUEST_USER);
      return GUEST_USER;
    } catch {
      // 异常（如 401），也视为 Guest
      clearCachedUser();
      setUser(GUEST_USER);
      return GUEST_USER;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveUser = useCallback(
    async (payload: Partial<UserProfile> & { password?: string }) => {
      if (isGuest) {
        console.warn('[UserContext] Guest cannot save user profile');
        return GUEST_USER;
      }

      setLoading(true);
      try {
        const updated = await saveCurrentUser(payload);
        setUser(updated);
        return updated;
      } finally {
        setLoading(false);
      }
    },
    [isGuest],
  );

  // 初始化拉取
  useEffect(() => {
    refreshUser().catch(() => undefined);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, isGuest, refreshUser, saveUser, clearUser }),
    [user, loading, isGuest, refreshUser, saveUser, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
