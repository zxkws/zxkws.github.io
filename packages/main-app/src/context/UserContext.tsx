import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearCachedUser,
  fetchCurrentUser,
  loadCachedUser,
  saveCurrentUser,
  setCachedUser,
  type UserProfile,
} from '../services/userService';
import { isPublicPath } from '../utils/publicRoutes';

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
  const [initialState] = useState(() => {
    const cachedUser = loadCachedUser();
    const pathname = typeof window === 'undefined' ? '/' : window.location.pathname;
    return {
      cachedUser,
      publicEntry: isPublicPath(pathname),
    };
  });
  const [user, setUser] = useState<UserProfile | null>(initialState.cachedUser);
  const [loading, setLoading] = useState(() => !initialState.cachedUser && !initialState.publicEntry);

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

  // 私有入口立即确认身份；公开入口先渲染首屏，再在浏览器空闲时静默同步登录状态。
  useEffect(() => {
    if (!initialState.publicEntry) {
      if (initialState.cachedUser) {
        setCachedUser(initialState.cachedUser);
        void refreshUser({ force: true, silent: true });
      } else {
        void refreshUser();
      }
      return undefined;
    }

    let idleId: number | undefined;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const revalidate = () => {
      if (!cancelled) {
        void refreshUser({ force: true, silent: true });
      }
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(revalidate, { timeout: 4000 });
    } else {
      timerId = globalThis.setTimeout(revalidate, 1500);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== undefined) {
        globalThis.clearTimeout(timerId);
      }
    };
  }, [initialState, refreshUser]);

  const value = useMemo(
    () => ({ user, loading, refreshUser, saveUser, clearUser }),
    [user, loading, refreshUser, saveUser, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
