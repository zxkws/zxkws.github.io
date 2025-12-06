import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { clearCachedUser, fetchCurrentUser, saveCurrentUser, type UserProfile } from '../services/userService';

type UserContextValue = {
  user: UserProfile | null;
  loading: boolean;
  /** 获取当前用户；force=true 时跳过缓存重新请求 */
  refreshUser: (opts?: { force?: boolean }) => Promise<UserProfile | null>;
  /** 调用后台保存并刷新本地缓存 */
  saveUser: (payload: Partial<UserProfile> & { password?: string }) => Promise<UserProfile | null>;
  /** 登出/清空时调用 */
  clearUser: () => void;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: false,
  refreshUser: async () => null,
  saveUser: async () => null,
  clearUser: () => undefined,
});

export const UserProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const clearUser = useCallback(() => {
    clearCachedUser();
    setUser(null);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      setLoading(true);
      try {
        const profile = await fetchCurrentUser(force);
        setUser(profile);
        return profile;
      } catch {
        clearUser();
        return null;
      } finally {
        setLoading(false);
      }
    },
    [clearUser],
  );

  const saveUser = useCallback(async (payload: Partial<UserProfile> & { password?: string }) => {
    setLoading(true);
    try {
      const updated = await saveCurrentUser(payload);
      setUser(updated);
      return updated;
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化时尝试拉取一次用户信息
  useEffect(() => {
    refreshUser().catch(() => undefined);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, saveUser, clearUser }),
    [user, loading, refreshUser, saveUser, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
