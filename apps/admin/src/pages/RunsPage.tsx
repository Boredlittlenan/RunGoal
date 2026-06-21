import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Tag, Button, Space, Typography, Select, DatePicker, Spin } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function RunsPage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string | undefined>();

  const fetchRuns = (p = 1) => {
    setLoading(true);
    (api as any).get('/runs', { params: { page: p, pageSize: 20, source: sourceFilter } })
      .then((res: any) => {
        setRuns(res.data);
        setTotal(res.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRuns(page); }, [page, sourceFilter]);

  const columns = [
    {
      title: '用户',
      key: 'user',
      render: (_: any, r: any) => (
        <Button type="link" size="small" onClick={() => navigate(`/users/${r.userId}`)}>
          {r.userNickname || '未知'}
        </Button>
      ),
    },
    {
      title: '距离',
      dataIndex: 'distance',
      key: 'distance',
      sorter: true,
      render: (v: number) => `${v.toFixed(2)} km`,
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (v: number) => {
        const h = Math.floor(v / 3600);
        const m = Math.floor((v % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m} 分钟`;
      },
    },
    {
      title: '配速',
      dataIndex: 'avgPace',
      key: 'pace',
      sorter: true,
      render: (v: number | null) => {
        if (!v) return '-';
        const min = Math.floor(v);
        const sec = Math.round((v - min) * 60);
        return `${min}:${sec.toString().padStart(2, '0')} /km`;
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (v: string) => (
        <Tag color={v === 'gps' ? 'green' : 'blue'}>{v === 'gps' ? 'GPS' : '手动'}</Tag>
      ),
    },
    {
      title: '感受',
      dataIndex: 'feeling',
      key: 'feeling',
      render: (v: number | null) => v ? ['😫','😓','😐','😊','🔥'][v - 1] : '-',
    },
    {
      title: '跑步时间',
      dataIndex: 'startedAt',
      key: 'time',
      sorter: true,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button type="link" size="small" onClick={() => navigate(`/runs/${record.id}`)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>跑步记录</Title>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="来源筛选"
          allowClear
          style={{ width: 140 }}
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[
            { label: '全部', value: undefined },
            { label: 'GPS', value: 'gps' },
            { label: '手动', value: 'manual' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => fetchRuns(page)}>
          刷新
        </Button>
      </Space>

      <Table
        dataSource={runs}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 条记录`,
        }}
      />
    </div>
  );
}
