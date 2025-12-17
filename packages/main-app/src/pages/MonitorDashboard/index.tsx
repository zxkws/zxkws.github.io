import { Card, message, Table, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { client } from '../../services/httpClient';

const { Title, Text } = Typography;

interface MonitorEvent {
  id: string;
  appId: string;
  type: string;
  data: unknown;
  userId: string;
  timestamp: string; // ISO string
  page: string;
}

const MonitorDashboard = () => {
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await client('/monitor/events', undefined, { method: 'GET' });
        const payload =
          res && typeof res === 'object' && 'data' in (res as Record<string, unknown>)
            ? (res as { data: unknown }).data
            : res;

        setEvents(Array.isArray(payload) ? (payload as MonitorEvent[]) : []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        message.error(`Failed to fetch monitor events: ${msg}`);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'App ID', dataIndex: 'appId', key: 'appId' },
    { title: 'Type', dataIndex: 'type', key: 'type' },
    { title: 'User ID', dataIndex: 'userId', key: 'userId' },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    { title: 'Page', dataIndex: 'page', key: 'page' },
    {
      title: 'Data',
      dataIndex: 'data',
      key: 'data',
      render: (value: unknown) => <pre>{JSON.stringify(value, null, 2)}</pre>,
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>监控数据概览</Title>
      <Text>这里将展示收集到的PV, UV, 性能指标和错误上报数据。</Text>

      <Card title="最新事件" style={{ marginTop: 24 }}>
        {error && <Text type="danger">{error}</Text>}
        <Table dataSource={events} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
};

export default MonitorDashboard;
