import { useEffect, useState } from 'react';
import { Table, Tag, Typography, Spin, Select, Space } from 'antd';
import api from '../lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function GoalsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const fetchGoals = (p = 1) => {
    setLoading(true);
    (api as any).get('/goals', { params: { page: p, pageSize: 20, type: typeFilter } })
      .then((res: any) => {
        setGoals(res.data);
        setTotal(res.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchGoals(page); }, [page, typeFilter]);

  const typeMap: Record<string, { label: string; color: string }> = {
    cumulative: { label: '累计型', color: 'blue' },
    frequency: { label: '频次型', color: 'green' },
    pace: { label: '配速型', color: 'orange' },
    distance: { label: '距离型', color: 'purple' },
  };

  const columns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '用户',
      key: 'user',
      render: (_: any, r: any) => r.userNickname || '-',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => {
        const t = typeMap[v];
        return t ? <Tag color={t.color}>{t.label}</Tag> : v;
      },
    },
    {
      title: '目标',
      key: 'target',
      render: (_: any, r: any) => `${r.targetValue} ${r.unit}`,
    },
    {
      title: '周期',
      dataIndex: 'period',
      key: 'period',
      render: (v: string) => {
        const map: Record<string, string> = { week: '周', month: '月', quarter: '季度', year: '年', custom: '自定义' };
        return map[v] || v;
      },
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'active',
      render: (v: boolean) => v ? <Tag color="green">进行中</Tag> : <Tag>已结束</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      <Title level={4}>目标管理</Title>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="类型筛选"
          allowClear
          style={{ width: 140 }}
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { label: '全部', value: undefined },
            { label: '累计型', value: 'cumulative' },
            { label: '频次型', value: 'frequency' },
            { label: '配速型', value: 'pace' },
            { label: '距离型', value: 'distance' },
          ]}
        />
      </Space>

      <Table
        dataSource={goals}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 个目标`,
        }}
      />
    </div>
  );
}
