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

type RbacStatus = {
  roleManageEnabled?: boolean | string;
};

const unwrapData = (payload: unknown): unknown =>
  payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : payload;

export default function PermissionAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [featureOn, setFeatureOn] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRaw, userListRaw, roleListRaw] = await Promise.all([
        client<unknown>('/v1/rbac/status', {}, { method: 'GET' }),
        client<unknown>('/v1/rbac/users', {}, { method: 'GET' }),
        client<unknown>('/v1/rbac/roles', {}, { method: 'GET' }),
      ]);

      const userData = unwrapData(userListRaw);
      const roleData = unwrapData(roleListRaw);
      const statusData = unwrapData(statusRaw);
      const enabled =
        statusData && typeof statusData === 'object' ? (statusData as RbacStatus).roleManageEnabled : undefined;

      setFeatureOn(enabled === true || enabled === 'true');
      setUsers(
        (Array.isArray(userData) ? (userData as UserRow[]) : []).map((userRow) => ({
          ...userRow,
          roles: Array.isArray(userRow.roles) ? userRow.roles : [],
        })),
      );
      setRoles(Array.isArray(roleData) ? (roleData as Role[]) : []);
    } catch (err) {
      const text = err instanceof Error ? err.message : '加载失败，请稍后再试';
      setError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: role.name })), [roles]);

  const handleRoleChange = async (userId: string, roleIds: number[]) => {
    setSavingId(userId);
    setError(null);
    try {
      await client(`/v1/rbac/users/${userId}/roles`, { roleIds }, { method: 'POST' });
      await fetchAll();
    } catch (err) {
      const text = err instanceof Error ? err.message : '更新角色失败';
      setError(text);
      message.error(text);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Access control</p>
          <h1>角色与权限</h1>
          <p className="workspace-page__description">查看用户的角色分配；服务端开关决定当前环境是否允许修改。</p>
        </div>
        <button type="button" onClick={fetchAll} className="workspace-button" disabled={loading}>
          {loading ? '刷新中…' : '刷新数据'}
        </button>
      </header>

      {error && (
        <div className="workspace-feedback workspace-feedback--error" role="alert">
          {error}
        </div>
      )}

      <section className="workspace-panel">
        {!loading && !featureOn && (
          <div className="workspace-feedback workspace-feedback--warning">
            角色管理功能未开启（ROLE_MANAGE_ENABLED=false），当前仅可查看，无法修改。
          </div>
        )}
        <div className="workspace-table-wrap">
          <table className="workspace-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>邮箱</th>
                <th>角色</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userRow) => (
                <tr key={userRow.userId}>
                  <td className="workspace-table__primary">{userRow.username}</td>
                  <td>{userRow.email}</td>
                  <td>
                    <div className="workspace-role-list">
                      {roleOptions.map((role) => {
                        const active = (userRow.roles || []).some((assignedRole) => assignedRole.id === role.value);
                        return (
                          <label key={role.value} className="workspace-role-option" data-active={active}>
                            <input
                              type="checkbox"
                              checked={active}
                              disabled={savingId === userRow.userId || !featureOn}
                              onChange={() => {
                                const current = new Set((userRow.roles || []).map((assignedRole) => assignedRole.id));
                                if (current.has(role.value)) {
                                  current.delete(role.value);
                                } else {
                                  current.add(role.value);
                                }
                                handleRoleChange(userRow.userId, Array.from(current));
                              }}
                            />
                            {role.label}
                          </label>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !users.length && (
                <tr>
                  <td colSpan={3} className="workspace-empty">
                    暂无用户数据
                  </td>
                </tr>
              )}
              {loading && !users.length && (
                <tr>
                  <td colSpan={3} className="workspace-empty">
                    正在加载角色数据…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
