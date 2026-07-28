import { message } from 'antd';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { type RbacMenu, rbacService } from '../../services/rbacService';
import '../rbac-admin.css';

type MenuRow = RbacMenu & { depth: number; parentId: number | null };

const emptyDraft = {
  title: '',
  path: '',
  icon: '',
  order: 0,
  visible: true,
  external: false,
  requiresAuth: true,
  adminOnly: false,
  permission: '',
  type: 'menu' as RbacMenu['type'],
  parentId: null as number | null,
};

const flattenMenus = (items: RbacMenu[], depth = 0, parentId: number | null = null): MenuRow[] =>
  items.flatMap((item) => [{ ...item, depth, parentId }, ...flattenMenus(item.children || [], depth + 1, item.id)]);

export default function MenuAdmin() {
  const [menus, setMenus] = useState<RbacMenu[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => flattenMenus(menus), [menus]);

  const load = async () => {
    setLoading(true);
    try {
      setMenus(await rbacService.listMenus());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '菜单加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = '菜单管理 · 光域';
    load();
  }, []);

  const startCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const startEdit = (row: MenuRow) => {
    setEditingId(row.id);
    setDraft({
      title: row.title,
      path: row.path || '',
      icon: row.icon || '',
      order: row.order,
      visible: row.visible,
      external: row.external,
      requiresAuth: row.requiresAuth,
      adminOnly: row.adminOnly,
      permission: row.permission || '',
      type: row.type,
      parentId: row.parentId,
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId === null) {
        await rbacService.createMenu(draft);
      } else {
        await rbacService.updateMenu(editingId, draft);
      }
      message.success(editingId === null ? '菜单已创建' : '菜单已更新');
      startCreate();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '菜单保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: MenuRow) => {
    if (!window.confirm(`确定删除菜单“${row.title}”吗？`)) return;
    try {
      await rbacService.deleteMenu(row.id);
      message.success('菜单已删除');
      if (editingId === row.id) startCreate();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '菜单删除失败');
    }
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">Access control / Menus</p>
          <h1>菜单管理</h1>
          <p className="workspace-page__description">维护工作台入口、层级、可见性与旧版菜单权限标识。</p>
        </div>
        <button type="button" className="workspace-button workspace-button--primary" onClick={startCreate}>
          新建菜单
        </button>
      </header>

      <div className="rbac-layout">
        <section className="workspace-panel">
          <div className="rbac-toolbar">
            <strong>{loading ? '加载中…' : `${rows.length} 个菜单`}</strong>
            <button type="button" className="workspace-button" onClick={load} disabled={loading}>
              刷新
            </button>
          </div>
          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>类型</th>
                  <th>路径</th>
                  <th>权限标识</th>
                  <th>可见</th>
                  <th>管理员</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="workspace-table__primary" style={{ paddingLeft: 16 + row.depth * 20 }}>
                      {row.title}
                    </td>
                    <td>{row.type}</td>
                    <td className="rbac-code">{row.path}</td>
                    <td className="rbac-code">{row.permission}</td>
                    <td>{String(row.visible)}</td>
                    <td>{String(row.adminOnly)}</td>
                    <td>
                      <div className="rbac-actions">
                        <button type="button" className="workspace-button" onClick={() => startEdit(row)}>
                          编辑
                        </button>
                        <button
                          type="button"
                          className="workspace-button workspace-button--danger"
                          onClick={() => remove(row)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !rows.length && (
                  <tr>
                    <td colSpan={7} className="workspace-empty">
                      暂无菜单
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="workspace-panel">
          <h2 className="rbac-editor-title">{editingId === null ? '新建菜单' : `编辑菜单 #${editingId}`}</h2>
          <p className="rbac-editor-note">保存后，已登录用户会按角色获得所分配的可见菜单。</p>
          <form className="rbac-form" onSubmit={submit}>
            <label>
              标题
              <input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                required
              />
            </label>
            <div className="rbac-inline-fields">
              <label>
                类型
                <select
                  value={draft.type}
                  onChange={(event) => setDraft({ ...draft, type: event.target.value as RbacMenu['type'] })}
                >
                  <option value="catalog">catalog</option>
                  <option value="menu">menu</option>
                  <option value="button">button</option>
                </select>
              </label>
              <label>
                父级
                <select
                  value={draft.parentId ?? ''}
                  onChange={(event) =>
                    setDraft({ ...draft, parentId: event.target.value ? Number(event.target.value) : null })
                  }
                >
                  <option value="">无</option>
                  {rows
                    .filter((row) => row.id !== editingId)
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {'—'.repeat(row.depth)} {row.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label>
              路径
              <input value={draft.path} onChange={(event) => setDraft({ ...draft, path: event.target.value })} />
            </label>
            <div className="rbac-inline-fields">
              <label>
                图标
                <input value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value })} />
              </label>
              <label>
                排序
                <input
                  type="number"
                  value={draft.order}
                  onChange={(event) => setDraft({ ...draft, order: Number(event.target.value) })}
                />
              </label>
            </div>
            <label>
              权限标识（兼容旧数据）
              <input
                value={draft.permission}
                onChange={(event) => setDraft({ ...draft, permission: event.target.value })}
              />
            </label>
            <fieldset className="rbac-fieldset">
              <legend>行为</legend>
              <div className="rbac-checkbox-grid">
                {(['visible', 'external', 'requiresAuth', 'adminOnly'] as const).map((field) => (
                  <label className="rbac-check" key={field}>
                    <input
                      type="checkbox"
                      checked={draft[field]}
                      onChange={(event) => setDraft({ ...draft, [field]: event.target.checked })}
                    />
                    {field}
                  </label>
                ))}
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
