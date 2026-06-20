import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin, Select, Space, Progress } from 'antd';
import api from '../lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const fetchChallenges = (p = 1) => {
    setLoading(true);
    (api as any).get('/challenges', { params: { page: p, pageSize: 20, status: statusFilter } })
      .then((res: any) => {
        setChallenges(res.data);
        setTotal(res.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchChallenges(page); }, [page, statusFilter]);

  const statusMap: Record<string, { label: string; color: string }> = {
    active: { label: '进行中', color: 'processing' },
    completed: { label: '已完成', color: 'success' },
    failed: { label: '已失败', color: 'error' },
  };

  const typeMap: Record<string, string> = {
    cumulative: '累计型',
    consecutive: '连续型',
    single_breakthrough: '单次突破',
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '发起人',
      key: 'user',
      render: (_: any, r: any) => r.user?.nickname || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => typeMap[v] || v,
    },
    {
      title: '目标',
      key: 'target',
      render: (_: any, r: any) => `${r.targetValue} ${r.unit}`,
    },
    {
      title: '进度',
      key: 'progress',
      render: (_: any, r: any) => {
        const pct = Math.min(100, Math.round((r.progress / r.targetValue) * 100));
        return <Progress percent={pct} size="small" style={{ width: 100 }} strokeColor="#00d26a" />;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => {
        const s = statusMap[v];
        return s ? <Tag color={s.color}>{s.label}</Tag> : v;
      },
    },
    {
      title: '截止时间',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (v: string) => dayjs(v).format('MM-DD'),
    },
  ];

  return (
    <div>
      <Title level={4}>挑战管理</Title>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="状态筛选"
          allowClear
          style={{ width: 140 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: '全部', value: undefined },
            { label: '进行中', value: 'active' },
            { label: '已完成', value: 'completed' },
            { label: '已失败', value: 'failed' },
          ]}
        />
      </Space>

      <Table
        dataSource={challenges}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 个挑战`,
        }}
      />
    </div>
  );
}
