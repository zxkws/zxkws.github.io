import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearCachedUser,
  fetchCurrentUser,
  loadCachedUser,
  saveCurrentUser,
  setCachedUser,
  type UserProfile,
} from '../services/userService';

type UserContextValue = {
  user: UserProfile | null;
  loading: boolean;
  /** 获取当前用户；force=true 时跳过缓存重新请求 */
  refreshUser: (opts?: { force?: boolean; silent?: boolean }) => Promise<UserProfile | null>;
  /** 调用后台保存并刷新本地缓存 */
  saveUser: (
    payload: Partial<UserProfile> & { currentPassword?: string; newPassword?: string },
  ) => Promise<UserProfile | null>;
  /** 登出/清空时调用 */
  clearUser: () => void;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true, // 默认为加载中，避免闪烁
  refreshUser: async (_opts) => null,
  saveUser: async (_payload) => null,
  clearUser: () => undefined,
});

export const UserProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserProfile | null>(() => loadCachedUser());
  const [loading, setLoading] = useState(() => !loadCachedUser());

  const clearUser = useCallback(() => {
    clearCachedUser();
    setUser(null);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(
    async ({ force = false, silent = false }: { force?: boolean; silent?: boolean } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const profile = await fetchCurrentUser(force);
        // 如果后端返回 null (未登录)，这里就是 null
        setUser(profile);
        return profile;
      } catch {
        // 发生错误（如网络问题或 401），视为未登录
        clearUser();
        return null;
      } finally {
        setLoading(false);
      }
    },
    [clearUser],
  );

  const saveUser = useCallback(
    async (payload: Partial<UserProfile> & { currentPassword?: string; newPassword?: string }) => {
      setLoading(true);
      try {
        const updated = await saveCurrentUser(payload);
        setUser(updated);
        return updated;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // 初始化时尝试拉取一次用户信息
  useEffect(() => {
    const cached = loadCachedUser();
    if (cached) {
      setCachedUser(cached);
      refreshUser({ force: true, silent: true }).catch(() => undefined);
      return;
    }
    refreshUser().catch(() => undefined);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, saveUser, clearUser }),
    [user, loading, refreshUser, saveUser, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
