import { Button, Form, Input, InputNumber, Modal, message, Popconfirm } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '../../context/UserContext';
import {
  createNavItem,
  deleteNavItem,
  fetchNavItems,
  type NavItem,
  type NavItemPayload,
  updateNavItem,
} from '../../services/navService';

const NavHome = () => {
  const { user } = useUser();
  const isAdmin = user?.role === 'admin' || user?.roles?.includes('admin');

  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<NavItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm<NavItemPayload>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchNavItems());
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载导航失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((item) => item.name.toLowerCase().includes(kw) || item.url.toLowerCase().includes(kw));
  }, [items, keyword]);

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    form.resetFields();
  };

  const openEdit = (item: NavItem) => {
    setCreating(false);
    setEditing(item);
    form.setFieldsValue({
      name: item.name,
      url: item.url,
      category: item.category ?? undefined,
      sort: item.sort,
    });
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const submit = async () => {
    const values = await form.validateFields();
    try {
      if (editing) {
        await updateNavItem(editing.id, values);
        message.success('已更新');
      } else {
        await createNavItem(values);
        message.success('已新增');
      }
      closeModal();
      load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    }
  };

  const remove = async (item: NavItem) => {
    try {
      await deleteNavItem(item.id);
      message.success('已删除');
      load();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '删除失败');
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-[var(--color-bg)] px-6 py-6 text-[var(--color-text)]">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">导航</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">共 {items.length} 项</p>
        </div>
        <div className="flex items-center gap-2">
          <Input.Search
            allowClear
            placeholder="搜索名称或地址"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ width: 260 }}
          />
          <Button onClick={load} loading={loading}>
            刷新
          </Button>
          {isAdmin && (
            <Button type="primary" onClick={openCreate}>
              新增
            </Button>
          )}
        </div>
      </header>

      {error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
        {visibleItems.map((item) => (
          <section
            key={item.id}
            className="flex flex-col gap-2 rounded-2xl border border-[var(--header-border)] bg-[var(--card-bg)] p-4 shadow-sm transition-shadow hover:shadow-lg"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-semibold hover:underline"
              title={item.name}
            >
              {item.name}
            </a>
            <span className="truncate text-xs text-[var(--color-muted)]" title={item.url}>
              {item.url}
            </span>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Button size="small" onClick={() => openEdit(item)}>
                  编辑
                </Button>
                <Popconfirm title={`删除 ${item.name}?`} onConfirm={() => remove(item)}>
                  <Button size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </div>
            )}
          </section>
        ))}
      </div>

      {!loading && visibleItems.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">
          {items.length === 0 ? '暂无导航项' : '没有匹配的导航项'}
        </p>
      )}

      <Modal
        open={creating || editing !== null}
        title={editing ? '编辑导航项' : '新增导航项'}
        onCancel={closeModal}
        onOk={submit}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item name="url" label="地址" rules={[{ required: true, message: '请输入地址' }]}>
            <Input maxLength={2000} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input maxLength={60} />
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber className="w-full" precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NavHome;
