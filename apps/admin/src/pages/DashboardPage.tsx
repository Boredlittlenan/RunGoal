import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Space, Spin } from 'antd';
import {
  UserOutlined,
  CarryOutOutlined,
  DashboardOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import api from '../lib/api';
import dayjs from 'dayjs';

interface DashboardData {
  totalUsers: number;
  todayNewUsers: number;
  totalRuns: number;
  todayRuns: number;
  totalDistance: number;
  todayDistance: number;
  activeUsers7d: number;
  recentRuns: Array<{
    id: string;
    userNickname: string;
    distance: number;
    duration: number;
    startedAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    nickname: string;
    phone: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (api as any).get('/dashboard').then((res: any) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <div>加载失败</div>;

  const runColumns = [
    {
      title: '用户',
      dataIndex: 'userNickname',
      key: 'user',
    },
    {
      title: '距离',
      dataIndex: 'distance',
      key: 'distance',
      render: (v: number) => `${v.toFixed(2)} km`,
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (v: number) => `${Math.round(v / 60)} 分钟`,
    },
    {
      title: '时间',
      dataIndex: 'startedAt',
      key: 'time',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
  ];

  const userColumns = [
    { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
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
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  return (
    <div>
      {/* 指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={data.totalUsers}
              prefix={<UserOutlined />}
              suffix={<span style={{ fontSize: 12, color: '#999' }}>今日 +{data.todayNewUsers}</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总跑步次数"
              value={data.totalRuns}
              prefix={<CarryOutOutlined />}
              suffix={<span style={{ fontSize: 12, color: '#999' }}>今日 +{data.todayRuns}</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="总跑量"
              value={data.totalDistance}
              precision={1}
              prefix={<DashboardOutlined />}
              suffix={<span style={{ fontSize: 12 }}>km</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="7日活跃用户"
              value={data.activeUsers7d}
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#00d26a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 最近数据 */}
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="最近跑步记录" size="small">
            <Table
              dataSource={data.recentRuns}
              columns={runColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="最近注册用户" size="small">
            <Table
              dataSource={data.recentUsers}
              columns={userColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
