import { useEffect, useMemo, useState } from 'react';
import { createFetchClient } from '@zxkws/shared-fetch';

type Role = 'user' | 'admin';

type Permission = {
  id: number;
  name: string;
  desc?: string;
};

type UserRow = {
  userId: string;
  username: string;
  email?: string;
  role: Role;
  permissions: Permission[];
};

const client = createFetchClient({
  baseURL: process.env.NODE_ENV === 'development' ? '/api' : 'https://api.zxkws.nyc.mn/api',
  credentials: 'include',
});

export default function PermissionAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userList, permList] = await Promise.all([
        client<UserRow[]>('/v1/rbac/users', {}, { method: 'GET' }),
        client<Permission[]>('/v1/rbac/permissions', {}, { method: 'GET' }),
      ]);
      setUsers(userList ?? []);
      setPerms(permList ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const roleOptions: Array<{ value: Role; label: string }> = useMemo(
    () => [
      { value: 'user', label: '普通用户' },
      { value: 'admin', label: '管理员' },
    ],
    [],
  );

  const togglePerm = (user: UserRow, permId: number) => {
    const current = new Set(user.permissions.map((p) => p.id));
    if (current.has(permId)) {
      current.delete(permId);
    } else {
      current.add(permId);
    }
    return Array.from(current);
  };

  const handleRoleChange = async (userId: string, role: Role) => {
    setSavingId(userId);
    try {
      await client('/v1/rbac/users/' + userId + '/role', { role }, { method: 'PATCH' });
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新角色失败');
    } finally {
      setSavingId(null);
    }
  };

  const handlePermChange = async (user: UserRow, permId: number) => {
    setSavingId(user.userId);
    try {
      const ids = togglePerm(user, permId);
      await client('/v1/rbac/users/' + user.userId + '/permissions', { permissionIds: ids }, { method: 'PATCH' });
      await fetchAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新权限失败');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[var(--color-bg)] px-6 py-6 text-[var(--color-text)]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">权限管理</h1>
          <p className="text-sm text-[var(--color-muted)]">仅管理员可见：授予角色与权限</p>
        </div>
        <button
          onClick={fetchAll}
          className="rounded bg-[var(--accent)] px-3 py-2 text-white shadow hover:brightness-95"
          disabled={loading}
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      {error && <div className="rounded border border-red-400 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-xl border border-[var(--header-border)] bg-[var(--card-bg)] p-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--header-border)] text-left">
              <th className="px-3 py-2">用户</th>
              <th className="px-3 py-2">邮箱</th>
              <th className="px-3 py-2">角色</th>
              <th className="px-3 py-2">权限</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId} className="border-b border-[var(--header-border)] last:border-0">
                <td className="px-3 py-2 font-medium">{u.username}</td>
                <td className="px-3 py-2">{u.email || '--'}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded border border-[var(--header-border)] bg-transparent px-2 py-1"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.userId, e.target.value as Role)}
                    disabled={savingId === u.userId}
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {perms.map((p) => {
                      const active = u.permissions.some((up) => up.id === p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => handlePermChange(u, p.id)}
                          disabled={savingId === u.userId}
                          className={`rounded-full px-3 py-1 text-xs ${
                            active
                              ? 'bg-[var(--accent)] text-white'
                              : 'border border-[var(--header-border)] text-[var(--color-text)]'
                          }`}
                        >
                          {p.name}
                        </button>
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
