import { Button, Form, Input, Modal, message, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type AdminUser,
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  type UserStatus,
  updateStatus,
  updateUser,
} from '../../services/adminUserService';

type EditorMode = 'create' | 'edit' | 'password' | null;

type UserFormValues = {
  username: string;
  email: string;
  password?: string;
  confirmPassword?: string;
};

const unwrapUsers = (payload: unknown): AdminUser[] => {
  const value =
    payload && typeof payload === 'object' && 'data' in payload ? (payload as { data?: unknown }).data : payload;
  return Array.isArray(value) ? (value as AdminUser[]) : [];
};

export default function UserAdmin() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>(null);
  const [activeUser, setActiveUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm<UserFormValues>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(unwrapUsers(await fetchUsers(keyword.trim() || undefined)));
    } catch (err) {
      const text = err instanceof Error ? err.message : '加载失败';
      setError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeEditor = () => {
    setMode(null);
    setActiveUser(null);
    form.resetFields();
  };

  const openCreate = () => {
    setActiveUser(null);
    setMode('create');
    form.setFieldsValue({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const openEdit = (user: AdminUser) => {
    setActiveUser(user);
    setMode('edit');
    form.setFieldsValue({ username: user.username, email: user.email ?? '' });
  };

  const openPassword = (user: AdminUser) => {
    setActiveUser(user);
    setMode('password');
    form.setFieldsValue({ password: '', confirmPassword: '' });
  };

  const saveEditor = async () => {
    const values = await form.validateFields();
    setSaving(true);
    setError(null);
    try {
      if (mode === 'create') {
        await createUser({
          username: values.username.trim(),
          email: values.email.trim(),
          password: values.password || '',
        });
        message.success('账号已创建');
      } else if (mode === 'edit' && activeUser) {
        await updateUser(activeUser.userId, {
          username: values.username.trim(),
          email: values.email.trim(),
        });
        message.success('账号资料已更新');
      } else if (mode === 'password' && activeUser) {
        await resetUserPassword(activeUser.userId, values.password || '');
        message.success('登录密码已重置');
      }
      closeEditor();
      await load();
    } catch (err) {
      const text = err instanceof Error ? err.message : '保存失败';
      setError(text);
      message.error(text);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = useCallback(
    async (record: AdminUser, status: UserStatus) => {
      if (record.status === status) return;
      setError(null);
      try {
        await updateStatus(record.userId, status);
        message.success('状态已更新');
        load();
      } catch (err) {
        const text = err instanceof Error ? err.message : '状态更新失败';
        setError(text);
        message.error(text);
      }
    },
    [load],
  );

  const handleDelete = useCallback(
    async (record: AdminUser) => {
      const confirmName = window.prompt(`删除后不可恢复。请输入用户名 ${record.username} 以确认：`);
      if (confirmName !== record.username) {
        message.info('已取消删除');
        return;
      }
      setError(null);
      try {
        await deleteUser(record.userId);
        message.success('用户已删除');
        load();
      } catch (err) {
        const text = err instanceof Error ? err.message : '删除失败';
        setError(text);
        message.error(text);
      }
    },
    [load],
  );

  const columns: ColumnsType<AdminUser> = useMemo(
    () => [
      { title: '用户名', dataIndex: 'username', key: 'username' },
      { title: '邮箱', dataIndex: 'email', key: 'email' },
      {
        title: '角色',
        dataIndex: 'roles',
        key: 'roles',
        render: (roles: AdminUser['roles']) => (
          <div className="workspace-role-list">
            {(roles ?? []).map((role, index) => (
              <Tag key={`${role.code}-${index}`}>{role.code}</Tag>
            ))}
          </div>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 180,
        render: (status: UserStatus, record) => (
          <Space>
            <Tag>{status}</Tag>
            <Select<UserStatus>
              size="small"
              value={status}
              onChange={(value) => handleStatus(record, value)}
              options={[
                { label: '正常', value: 'active' },
                { label: '冻结', value: 'frozen' },
                { label: '封禁', value: 'banned' },
              ]}
            />
          </Space>
        ),
      },
      {
        title: '操作',
        key: 'actions',
        width: 220,
        render: (_, record) => (
          <Space wrap>
            <Button size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Button size="small" onClick={() => openPassword(record)}>
              重置密码
            </Button>
            <Popconfirm
              title="确认删除该用户？"
              description="下一步还需要输入用户名。"
              okText="继续"
              cancelText="取消"
              onConfirm={() => handleDelete(record)}
            >
              <Button danger size="small">
                删除
              </Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [handleDelete, handleStatus],
  );

  const passwordRules = [
    { required: true, message: '请输入密码' },
    { min: 10, message: '密码至少 10 位' },
    { max: 128, message: '密码不能超过 128 位' },
  ];

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">User operations</p>
          <h1>用户管理</h1>
          <p className="workspace-page__description">创建和维护系统登录账号，调整账号状态或重置密码。</p>
        </div>
        <div className="workspace-page__actions">
          <Input.Search
            placeholder="按用户名/邮箱搜索"
            aria-label="按用户名或邮箱搜索"
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onSearch={load}
            className="workspace-search"
          />
          <Button onClick={load} loading={loading}>
            刷新
          </Button>
          <Button type="primary" onClick={openCreate}>
            创建账号
          </Button>
        </div>
      </header>

      {error && (
        <div className="workspace-feedback workspace-feedback--error" role="alert">
          {error}
        </div>
      )}

      <section className="workspace-panel workspace-panel--flush">
        <Table
          rowKey="userId"
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{ hideOnSinglePage: true }}
          scroll={{ x: 920 }}
          locale={{ emptyText: loading ? '正在加载用户数据…' : '暂无用户数据' }}
        />
      </section>

      <Modal
        title={mode === 'create' ? '创建系统账号' : mode === 'edit' ? '编辑账号资料' : '重置登录密码'}
        open={mode !== null}
        onCancel={closeEditor}
        onOk={saveEditor}
        confirmLoading={saving}
        destroyOnHidden
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" preserve={false}>
          {(mode === 'create' || mode === 'edit') && (
            <>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 6, max: 30, message: '用户名需为 6-30 位' },
                  { pattern: /^[a-zA-Z0-9#$%_-]+$/, message: '用户名包含不支持的字符' },
                ]}
              >
                <Input autoComplete="off" />
              </Form.Item>
              <Form.Item
                name="email"
                label="邮箱"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效邮箱' },
                ]}
              >
                <Input type="email" autoComplete="off" />
              </Form.Item>
            </>
          )}
          {(mode === 'create' || mode === 'password') && (
            <>
              <Form.Item name="password" label="新密码" rules={passwordRules}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请再次输入密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      return !value || getFieldValue('password') === value
                        ? Promise.resolve()
                        : Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
