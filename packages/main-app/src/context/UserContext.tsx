import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearCachedUser, fetchCurrentUser, saveCurrentUser, type UserProfile } from '../services/userService';

// 定义虚拟游客用户
export const GUEST_USER: UserProfile = {
  userId: 'guest-001',
  username: 'Guest Visitor',
  email: 'guest@example.com',
  role: 'guest',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest', // 一个机器人头像
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
  /** 开启游客模式 */
  loginAsGuest: () => void;
};

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: false,
  isGuest: false,
  refreshUser: async (_opts) => null,
  saveUser: async (_payload) => null,
  clearUser: () => undefined,
  loginAsGuest: () => undefined,
});

export const UserProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 判断当前是否是游客
  const isGuest = useMemo(() => user?.role === 'guest', [user]);

  // 处理从 OAuth 回跳带 ?token= 的场景：落地存储并清理地址栏
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

    // 检查是否有游客标记
    if (window.localStorage.getItem('is_guest') === 'true' && !token) {
      setUser(GUEST_USER);
      setLoading(false);
    }
  }, []);

  const clearUser = useCallback(() => {
    clearCachedUser();
    window.localStorage.removeItem('is_guest');
    setUser(null);
    setLoading(false);
  }, []);

  const loginAsGuest = useCallback(() => {
    window.localStorage.setItem('is_guest', 'true');
    setUser(GUEST_USER);
  }, []);

  const refreshUser = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      // 如果是游客，不需要去后端拉取
      if (window.localStorage.getItem('is_guest') === 'true') {
        setUser(GUEST_USER);
        setLoading(false);
        return GUEST_USER;
      }

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

  const saveUser = useCallback(
    async (payload: Partial<UserProfile> & { password?: string }) => {
      if (isGuest) {
        // 游客不能保存后端数据，这里可以抛出错误或静默失败
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

  // 初始化时尝试拉取一次用户信息
  useEffect(() => {
    refreshUser().catch(() => undefined);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, isGuest, refreshUser, saveUser, clearUser, loginAsGuest }),
    [user, loading, isGuest, refreshUser, saveUser, clearUser, loginAsGuest],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => useContext(UserContext);
