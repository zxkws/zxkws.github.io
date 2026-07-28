import { message } from 'antd';
import { type FormEvent, useEffect, useState } from 'react';
import { type RbacPermission, rbacService } from '../../services/rbacService';
import '../rbac-admin.css';

const emptyDraft = {
  name: '',
  code: '',
  resource: '',
  action: '',
  desc: '',
  enabled: true,
};

export default function PermissionAdmin() {
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setPermissions(await rbacService.listPermissions());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '权限加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = '权限管理 · 光域';
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const startEdit = (permission: RbacPermission) => {
    setEditingId(permission.id);
    setDraft({
      name: permission.name,
      code: permission.code,
      resource: permission.resource || '',
      action: permission.action || '',
      desc: permission.desc || '',
      enabled: permission.enabled,
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId === null) {
        await rbacService.createPermission(draft);
      } else {
        await rbacService.updatePermission(editingId, draft);
      }
      message.success(editingId === null ? '权限已创建' : '权限已更新');
      startCreate();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '权限保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (permission: RbacPermission) => {
    if (!window.confirm(`确定删除权限“${permission.name}”吗？`)) return;
    try {
      await rbacService.deletePermission(permission.id);
      message.success('权限已删除');
      if (editingId === permission.id) startCreate();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '权限删除失败');
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Access control / Permissions</p>
          <h1>权限管理</h1>
          <p className="workspace-page__description">维护独立权限标识；角色启用后，标识会随登录态下发。</p>
        </div>
        <button type="button" className="workspace-button workspace-button--primary" onClick={startCreate}>
          新建权限
        </button>
      </header>

      <div className="rbac-layout">
        <section className="workspace-panel">
          <div className="rbac-toolbar">
            <strong>{loading ? '加载中…' : `${permissions.length} 个权限`}</strong>
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
                  <th>资源</th>
                  <th>操作</th>
                  <th>启用</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.id}>
                    <td className="workspace-table__primary">{permission.name}</td>
                    <td className="rbac-code">{permission.code}</td>
                    <td>{permission.resource}</td>
                    <td>{permission.action}</td>
                    <td>{String(permission.enabled)}</td>
                    <td>{permission.uts}</td>
                    <td>
                      <div className="rbac-actions">
                        <button type="button" className="workspace-button" onClick={() => startEdit(permission)}>
                          编辑
                        </button>
                        <button
                          type="button"
                          className="workspace-button workspace-button--danger"
                          onClick={() => remove(permission)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !permissions.length && (
                  <tr>
                    <td colSpan={7} className="workspace-empty">
                      暂无权限
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="workspace-panel">
          <h2 className="rbac-editor-title">{editingId === null ? '新建权限' : `编辑权限 #${editingId}`}</h2>
          <p className="rbac-editor-note">编码应稳定，例如 agent.run；resource 与 action 按服务端原值保存。</p>
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
                资源
                <input
                  value={draft.resource}
                  onChange={(event) => setDraft({ ...draft, resource: event.target.value })}
                />
              </label>
              <label>
                操作
                <input value={draft.action} onChange={(event) => setDraft({ ...draft, action: event.target.value })} />
              </label>
            </div>
            <label>
              描述
              <textarea value={draft.desc} onChange={(event) => setDraft({ ...draft, desc: event.target.value })} />
            </label>
            <label className="rbac-check">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })}
              />
              enabled
            </label>
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
