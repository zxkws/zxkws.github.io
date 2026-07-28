import { Button, Input, message, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteUser, fetchUsers, updateStatus } from '../../services/adminUserService';
import type { UserProfile } from '../../services/userService';

type UserStatus = 'active' | 'frozen' | 'banned';

type AdminRole = {
  code?: string;
  name?: string;
};

type AdminUser = Omit<UserProfile, 'roles'> & {
  email?: string;
  status?: UserStatus;
  roles?: AdminRole[];
};

export default function UserAdmin() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers(keyword.trim() || undefined);
      const resUnknown = res as unknown;
      const dataSource =
        resUnknown && typeof resUnknown === 'object' && 'data' in (resUnknown as Record<string, unknown>)
          ? (resUnknown as { data?: unknown }).data
          : resUnknown;
      setData(Array.isArray(dataSource) ? (dataSource as AdminUser[]) : []);
    } catch (err) {
      const text = err instanceof Error ? err.message : '加载失败';
      setError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  // 仅首次加载，后续由搜索/刷新/操作后手动触发
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatus = useCallback(
    async (record: AdminUser, status: UserStatus) => {
      if (record.status === status) return;
      setError(null);
      try {
        await updateStatus(String(record.userId || ''), status);
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
      const confirmName = window.prompt(
        `确认删除用户 ${record.username} ?\n删除将清空其数据且不可恢复。请输入用户名以确认：`,
      );
      if (confirmName !== record.username) {
        message.info('已取消删除');
        return;
      }
      setError(null);
      try {
        await deleteUser(String(record.userId || ''));
        message.success('用户已删除，相关数据将不可恢复');
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
        render: (roles?: AdminRole[]) => (
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
        render: (status: UserStatus | undefined, record) => (
          <Space>
            <Tag>{status}</Tag>
            <Select<UserStatus>
              size="small"
              value={status}
              onChange={(v) => handleStatus(record, v)}
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
        render: (_, record) => (
          <Space>
            <Popconfirm
              title="确认删除该用户？"
              description="删除将清空用户在系统中的数据且不可恢复。"
              okText="确定删除"
              okButtonProps={{ danger: true }}
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
    [handleStatus, handleDelete],
  );

  return (
    <div className="workspace-page">
      <header className="workspace-page__header">
        <div>
          <p className="workspace-page__eyebrow">User operations</p>
          <h1>用户管理</h1>
          <p className="workspace-page__description">查询用户、调整账号状态或删除账号。删除操作不可恢复。</p>
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
        </div>
      </header>

      {error && (
        <div className="workspace-feedback workspace-feedback--error" role="alert">
          {error}
        </div>
      )}

      <section className="workspace-panel workspace-panel--flush">
        <Table
          rowKey={(record) => String(record.userId)}
          loading={loading}
          columns={columns}
          dataSource={data}
          pagination={{ hideOnSinglePage: true }}
          scroll={{ x: 760 }}
          locale={{ emptyText: loading ? '正在加载用户数据…' : '暂无用户数据' }}
        />
      </section>
    </div>
  );
}
