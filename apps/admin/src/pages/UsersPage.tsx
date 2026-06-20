import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Button, Tag, Space, Typography, DatePicker } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import api from '../lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const fetchUsers = (p = 1) => {
    setLoading(true);
    (api as any).get('/users', { params: { page: p, pageSize: 20, search } })
      .then((res: any) => {
        setUsers(res.data);
        setTotal(res.meta?.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(page); }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1);
  };

  const columns = [
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text: string, record: any) => (
        <Button type="link" onClick={() => navigate(`/users/${record.id}`)}>
          {text}
        </Button>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      render: (v: string) => v.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '总跑量',
      key: 'totalDistance',
      sorter: true,
      render: (_: any, record: any) => `${(record._count?.runs || 0) > 0 ? '—' : '0'} km`,
    },
    {
      title: '跑步次数',
      key: 'runCount',
      render: (_: any, record: any) => (
        <Tag>{record._count?.runs || 0} 次</Tag>
      ),
    },
    {
      title: '最近跑步',
      key: 'lastRun',
      render: (_: any, record: any) => {
        const runs = record.runs;
        if (!runs || runs.length === 0) return <span style={{ color: '#999' }}>无记录</span>;
        return dayjs(runs[0].startedAt).format('MM-DD');
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/users/${record.id}`)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>用户管理</Title>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索昵称 / 手机号"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: 260 }}
          allowClear
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
        <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(page)}>
          刷新
        </Button>
      </Space>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showTotal: (t) => `共 ${t} 个用户`,
        }}
      />
    </div>
  );
}
