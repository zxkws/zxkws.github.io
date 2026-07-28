import { message } from 'antd';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  type RbacMenu,
  type RbacPermission,
  type RbacRole,
  type RbacUser,
  rbacService,
} from '../../services/rbacService';
import '../rbac-admin.css';

type MenuOption = RbacMenu & { depth: number };

const flattenMenus = (items: RbacMenu[], depth = 0): MenuOption[] =>
  items.flatMap((item) => [{ ...item, depth }, ...flattenMenus(item.children || [], depth + 1)]);

const emptyDraft = {
  name: '',
  code: '',
  desc: '',
  enabled: true,
  order: 0,
  menuIds: [] as number[],
  permissionIds: [] as number[],
};

const toggleId = (list: number[], id: number) =>
  list.includes(id) ? list.filter((item) => item !== id) : [...list, id];

export default function RoleAdmin() {
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [menus, setMenus] = useState<RbacMenu[]>([]);
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const menuOptions = useMemo(() => flattenMenus(menus), [menus]);

  const load = async () => {
    setLoading(true);
    try {
      const [nextRoles, nextMenus, nextPermissions, nextUsers] = await Promise.all([
        rbacService.listRoles(),
        rbacService.listMenus(),
        rbacService.listPermissions(),
        rbacService.listUsers(),
      ]);
      setRoles(nextRoles);
      setMenus(nextMenus);
      setPermissions(nextPermissions);
      setUsers(nextUsers);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '角色数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = '角色管理 · 光域';
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const startEdit = (role: RbacRole) => {
    setEditingId(role.id);
    setDraft({
      name: role.name,
      code: role.code,
      desc: role.desc || '',
      enabled: role.enabled,
      order: role.order,
      menuIds: (role.menus || []).map((menu) => menu.id),
      permissionIds: (role.permissions || []).map((permission) => permission.id),
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId === null) {
        await rbacService.createRole(draft);
      } else {
        await rbacService.updateRole(editingId, draft);
      }
      message.success(editingId === null ? '角色已创建' : '角色已更新');
      startCreate();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '角色保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (role: RbacRole) => {
    if (!window.confirm(`确定删除角色“${role.name}”吗？`)) return;
    try {
      await rbacService.deleteRole(role.id);
      message.success('角色已删除');
      if (editingId === role.id) startCreate();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '角色删除失败');
    }
  };

  const assignRole = async (user: RbacUser, roleId: number) => {
    const current = (user.roles || []).map((role) => role.id);
    setSavingUserId(user.userId);
    try {
      await rbacService.assignUserRoles(user.userId, toggleId(current, roleId));
      await load();
      message.success('用户角色已更新');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '用户角色更新失败');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Access control / Roles</p>
          <h1>角色管理</h1>
          <p className="workspace-page__description">组合菜单与独立权限，并把角色分配给用户。</p>
        </div>
        <button type="button" className="workspace-button workspace-button--primary" onClick={startCreate}>
          新建角色
        </button>
      </header>

      <div className="rbac-layout">
        <div>
          <section className="workspace-panel rbac-section">
            <div className="rbac-toolbar">
              <strong>{loading ? '加载中…' : `${roles.length} 个角色`}</strong>
              <button type="button" className="workspace-button" onClick={load} disabled={loading}>
                刷新
              </button>
            </div>
            <div className="workspace-table-wrap">
              <table className="workspace-table">
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>编码</th>
                    <th>启用</th>
                    <th>排序</th>
                    <th>菜单数</th>
                    <th>权限数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id}>
                      <td className="workspace-table__primary">{role.name}</td>
                      <td className="rbac-code">{role.code}</td>
                      <td>{String(role.enabled)}</td>
                      <td>{role.order}</td>
                      <td>{role.menus?.length}</td>
                      <td>{role.permissions?.length}</td>
                      <td>
                        <div className="rbac-actions">
                          <button type="button" className="workspace-button" onClick={() => startEdit(role)}>
                            编辑
                          </button>
                          <button
                            type="button"
                            className="workspace-button workspace-button--danger"
                            onClick={() => remove(role)}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && !roles.length && (
                    <tr>
                      <td colSpan={7} className="workspace-empty">
                        暂无角色
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="workspace-panel rbac-section">
            <div className="rbac-toolbar">
              <div>
                <strong>用户角色分配</strong>
                <p className="rbac-editor-note">勾选后立即保存。</p>
              </div>
            </div>
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
                  {users.map((user) => (
                    <tr key={user.userId}>
                      <td className="workspace-table__primary">{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <div className="rbac-checkbox-grid">
                          {roles.map((role) => (
                            <label className="rbac-check" key={role.id}>
                              <input
                                type="checkbox"
                                checked={(user.roles || []).some((item) => item.id === role.id)}
                                disabled={savingUserId === user.userId}
                                onChange={() => assignRole(user, role.id)}
                              />
                              {role.name}
                            </label>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && !users.length && (
                    <tr>
                      <td colSpan={3} className="workspace-empty">
                        暂无用户
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="workspace-panel">
          <h2 className="rbac-editor-title">{editingId === null ? '新建角色' : `编辑角色 #${editingId}`}</h2>
          <p className="rbac-editor-note">admin 角色不可删除；编码修改与关联数据由服务端校验。</p>
          <form className="rbac-form" onSubmit={submit}>
            <label>
              名称
              <input
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                required
              />
            </label>
            <label>
              编码
              <input
                value={draft.code}
                onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                required
              />
            </label>
            <div className="rbac-inline-fields">
              <label>
                排序
                <input
                  type="number"
                  value={draft.order}
                  onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) })}
                />
              </label>
              <label className="rbac-check">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
                />
                enabled
              </label>
            </div>
            <label>
              描述
              <textarea value={draft.desc} onChange={(event) => setDraft({ ...draft, desc: event.target.value })} />
            </label>
            <fieldset className="rbac-fieldset">
              <legend>菜单</legend>
              <div className="rbac-checkbox-grid">
                {menuOptions.map((menu) => (
                  <label className="rbac-check" key={menu.id}>
                    <input
                      type="checkbox"
                      checked={draft.menuIds.includes(menu.id)}
                      onChange={() => setDraft({ ...draft, menuIds: toggleId(draft.menuIds, menu.id) })}
                    />
                    {'—'.repeat(menu.depth)} {menu.title}
                  </label>
                ))}
                {!menuOptions.length && <span className="rbac-muted">暂无菜单</span>}
              </div>
            </fieldset>
            <fieldset className="rbac-fieldset">
              <legend>权限</legend>
              <div className="rbac-checkbox-grid">
                {permissions.map((permission) => (
                  <label className="rbac-check" key={permission.id}>
                    <input
                      type="checkbox"
                      checked={draft.permissionIds.includes(permission.id)}
                      onChange={() =>
                        setDraft({ ...draft, permissionIds: toggleId(draft.permissionIds, permission.id) })
                      }
                    />
                    {permission.name} · {permission.code}
                  </label>
                ))}
                {!permissions.length && <span className="rbac-muted">暂无权限</span>}
              </div>
            </fieldset>
            <div className="rbac-actions">
              <button type="submit" className="workspace-button workspace-button--primary" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
              <button type="button" className="workspace-button" onClick={startCreate}>
                清空
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
