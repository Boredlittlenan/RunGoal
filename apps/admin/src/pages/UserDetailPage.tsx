import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Tag, Button, Spin, Typography, Row, Col, Statistic, Empty } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (api as any).get(`/users/${id}`).then((res: any) => {
      setUser(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!user) return <Empty description="用户不存在" />;

  const runColumns = [
    {
      title: '日期',
      dataIndex: 'startedAt',
      key: 'date',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    { title: '距离 (km)', dataIndex: 'distance', key: 'distance', render: (v: number) => v.toFixed(2) },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (v: number) => `${Math.round(v / 60)} 分钟`,
    },
    {
      title: '配速',
      dataIndex: 'avgPace',
      key: 'pace',
      render: (v: number | null) => {
        if (!v) return '-';
        const min = Math.floor(v);
        const sec = Math.round((v - min) * 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
      },
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (v: string) => <Tag color={v === 'gps' ? 'green' : 'blue'}>{v === 'gps' ? 'GPS' : '手动'}</Tag>,
    },
    {
      title: '感受',
      dataIndex: 'feeling',
      key: 'feeling',
      render: (v: number | null) => v ? ['😫','😓','😐','😊','🔥'][v - 1] : '-',
    },
  ];

  const goalColumns = [
    { title: '标题', dataIndex: 'title', key: 'title' },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (v: string) => {
        const map: Record<string, string> = { cumulative: '累计', frequency: '频次', pace: '配速', distance: '距离' };
        return <Tag>{map[v] || v}</Tag>;
      },
    },
    {
      title: '目标',
      key: 'target',
      render: (_: any, r: any) => `${r.targetValue} ${r.unit}`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'active',
      render: (v: boolean) => v ? <Tag color="green">进行中</Tag> : <Tag>已结束</Tag>,
    },
  ];

  const achievementColumns = [
    {
      title: '成就',
      dataIndex: 'achievementKey',
      key: 'key',
    },
    {
      title: '解锁时间',
      dataIndex: 'unlockedAt',
      key: 'time',
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
  ];

  // 计算统计
  const totalDistance = user.runs?.reduce((sum: number, r: any) => sum + r.distance, 0) || 0;
  const totalDuration = user.runs?.reduce((sum: number, r: any) => sum + r.duration, 0) || 0;

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>

      <Title level={4}>{user.nickname} 的详情</Title>

      {/* 基础信息 */}
      <Card title="基础信息" size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="手机号">{user.phone}</Descriptions.Item>
          <Descriptions.Item label="体重">{user.weight ? `${user.weight} kg` : '未设置'}</Descriptions.Item>
          <Descriptions.Item label="身高">{user.height ? `${user.height} cm` : '未设置'}</Descriptions.Item>
          <Descriptions.Item label="注册时间">{dayjs(user.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="主题偏好">{user.theme}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 跑步统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small"><Statistic title="总跑量" value={totalDistance} precision={1} suffix="km" /></Card>
        </Col>
        <Col xs={8}>
          <Card size="small"><Statistic title="跑步次数" value={user.runs?.length || 0} suffix="次" /></Card>
        </Col>
        <Col xs={8}>
          <Card size="small"><Statistic title="总时长" value={Math.round(totalDuration / 60)} suffix="分钟" /></Card>
        </Col>
      </Row>

      {/* 跑步记录 */}
      <Card title={`跑步记录 (${user.runs?.length || 0})`} size="small" style={{ marginBottom: 16 }}>
        <Table dataSource={user.runs || []} columns={runColumns} rowKey="id" pagination={{ pageSize: 10 }} size="small" />
      </Card>

      {/* 目标 */}
      <Card title={`目标 (${user.goals?.length || 0})`} size="small" style={{ marginBottom: 16 }}>
        <Table dataSource={user.goals || []} columns={goalColumns} rowKey="id" pagination={false} size="small" />
      </Card>

      {/* 成就 */}
      <Card title={`已解锁成就 (${user.achievements?.length || 0})`} size="small">
        <Table dataSource={user.achievements || []} columns={achievementColumns} rowKey="id" pagination={false} size="small" />
      </Card>
    </div>
  );
}
