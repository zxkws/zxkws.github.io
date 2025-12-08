import { Button, Input, message, Popconfirm, Select, Space, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { deleteUser, fetchUsers, updateStatus } from '../../services/adminUserService';
import type { UserProfile } from '../../services/userService';

type UserStatus = 'active' | 'frozen' | 'banned';

type AdminUser = UserProfile & {
  email?: string;
  status?: UserStatus;
};

const statusColor: Record<UserStatus, string> = {
  active: 'green',
  frozen: 'gold',
  banned: 'red',
};

export default function UserAdmin() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchUsers(keyword.trim() || undefined);
      const resUnknown = res as unknown;
      const dataSource =
        resUnknown && typeof resUnknown === 'object' && 'data' in (resUnknown as Record<string, unknown>)
          ? (resUnknown as { data?: unknown }).data
          : resUnknown;
      setData(Array.isArray(dataSource) ? (dataSource as AdminUser[]) : []);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (record: AdminUser, status: UserStatus) => {
    if (record.status === status) return;
    await updateStatus(String(record.id || record.username || ''), status);
    message.success('状态已更新');
    load();
  };

  const handleDelete = async (record: AdminUser) => {
    const confirmName = window.prompt(
      `确认删除用户 ${record.username} ?\n删除将清空其数据且不可恢复。请输入用户名以确认：`,
    );
    if (confirmName !== record.username) {
      message.info('已取消删除');
      return;
    }
    await deleteUser(String(record.id || record.username || ''));
    message.success('用户已删除，相关数据将不可恢复');
    load();
  };

  const columns: ColumnsType<AdminUser> = useMemo(
    () => [
      { title: '用户名', dataIndex: 'username', key: 'username' },
      { title: '邮箱', dataIndex: 'email', key: 'email' },
      {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
        render: (role) => (role === 'admin' ? '管理员' : '用户'),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status: UserStatus = 'active', record) => (
          <Space>
            <Tooltip
              title={
                status === 'active'
                  ? '正常可登录'
                  : status === 'frozen'
                    ? '冻结：不可登录，可由管理员解冻'
                    : '封禁：不可登录，需要管理员解除'
              }
            >
              <Tag color={statusColor[status]}>{status}</Tag>
            </Tooltip>
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
    [],
  );

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-[var(--color-bg)] px-6 py-6 text-[var(--color-text)]">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">用户管理</h1>
          <p className="text-sm text-[var(--color-muted)]">管理员可查询/封禁/删除用户；删除不可恢复</p>
        </div>
        <Space>
          <Input.Search
            placeholder="按用户名/邮箱搜索"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={load}
            style={{ width: 240 }}
          />
          <Button onClick={load} loading={loading}>
            刷新
          </Button>
        </Space>
      </header>
      <Table rowKey={(r) => String(r.id || r.username)} loading={loading} columns={columns} dataSource={data} />
    </div>
  );
}
