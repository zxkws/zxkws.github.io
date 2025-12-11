import { message } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { client } from '../../services/httpClient';

type Role = {
  id: number;
  code: string;
  name: string;
  desc?: string;
};

type UserRow = {
  userId: string;
  username: string;
  email?: string;
  roles?: Role[];
};

export default function PermissionAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [featureOn, setFeatureOn] = useState<boolean>(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRaw, userListRaw, roleListRaw] = await Promise.all([
        client<unknown>('/v1/rbac/status', {}, { method: 'GET' }),
        client<unknown>('/v1/rbac/users', {}, { method: 'GET' }),
        client<unknown>('/v1/rbac/roles', {}, { method: 'GET' }),
      ]);

      const normalizeUsers = (payload: unknown): UserRow[] => {
        const data =
          payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : payload;
        if (Array.isArray(data)) {
          return data as UserRow[];
        }
        return [];
      };

      const normalizeRoles = (payload: unknown): Role[] => {
        const data =
          payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : payload;
        if (Array.isArray(data)) {
          return data as Role[];
        }
        return [];
      };

      const sanitizedUsers = normalizeUsers(userListRaw).map((u) => ({
        ...u,
        roles: Array.isArray(u.roles) ? u.roles : [],
      }));

      // feature flag
      const status =
        statusRaw && typeof statusRaw === 'object' && 'data' in statusRaw
          ? (statusRaw as { data?: any }).data
          : statusRaw;
      const enabled = (status as any)?.roleManageEnabled;
      setFeatureOn(enabled === true || enabled === 'true');

      setUsers(sanitizedUsers);
      setRoles(normalizeRoles(roleListRaw));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请稍后再试');
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);

  const handleRoleChange = async (userId: string, roleIds: number[]) => {
    setSavingId(userId);
    try {
      await client(`/v1/rbac/users/${userId}/roles`, { roleIds }, { method: 'POST' });
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新角色失败');
      message.error(err instanceof Error ? err.message : '更新角色失败');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[var(--color-bg)] px-6 py-6 text-[var(--color-text)]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">角色管理</h1>
          <p className="text-sm text-[var(--color-muted)]">任何人可见；服务端开关控制是否可编辑</p>
        </div>
        <button
          type="button"
          onClick={fetchAll}
          className="rounded bg-[var(--accent)] px-3 py-2 text-white shadow hover:brightness-95"
          disabled={loading}
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      {error && <div className="rounded border border-red-400 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-[var(--header-border)] bg-[var(--card-bg)] p-2">
        {!featureOn && (
          <div className="mb-3 rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            角色管理功能未开启（ROLE_MANAGE_ENABLED=false），当前仅可查看，无法修改。
          </div>
        )}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--header-border)] text-left">
              <th className="px-3 py-2">用户</th>
              <th className="px-3 py-2">邮箱</th>
              <th className="px-3 py-2">角色</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId} className="border-b border-[var(--header-border)] last:border-0">
                <td className="px-3 py-2 font-medium">{u.username}</td>
                <td className="px-3 py-2">{u.email || '--'}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {roleOptions.map((r) => {
                      const active = (u.roles || []).some((ur) => ur.id === r.value);
                      return (
                        <label
                          key={r.value}
                          className={`flex cursor-pointer items-center gap-1 rounded border px-2 py-1 text-xs ${
                            active
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                              : 'border-[var(--header-border)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            disabled={savingId === u.userId || !featureOn}
                            onChange={() => {
                              const current = new Set((u.roles || []).map((ur) => ur.id));
                              if (current.has(r.value)) {
                                current.delete(r.value);
                              } else {
                                current.add(r.value);
                              }
                              handleRoleChange(u.userId, Array.from(current));
                            }}
                          />
                          {r.label}
                        </label>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-[var(--color-muted)]">
                  暂无用户数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
