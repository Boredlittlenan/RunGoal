import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Spin, Row, Col, Statistic, Progress } from 'antd';
import { TrophyOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import api from '../lib/api';

const { Title } = Typography;

const rarityColors: Record<string, string> = {
  common: '#8c8c8c',
  rare: '#1890ff',
  epic: '#722ed1',
  legendary: '#fa8c16',
};

const rarityLabels: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

const categoryLabels: Record<string, string> = {
  milestone: '里程碑',
  volume: '累计',
  streak: '连续打卡',
  performance: '配速/表现',
  fun: '趣味',
};

export default function AchievementsPage() {
  const [stats, setStats] = useState<any>(null);
  const [achievementStats, setAchievementStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      (api as any).get('/achievements/stats'),
      (api as any).get('/achievements'),
    ]).then(([statsRes, listRes]: any[]) => {
      setStats(statsRes.data);
      setAchievementStats(listRes.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const columns = [
    {
      title: '成就',
      key: 'name',
      render: (_: any, r: any) => (
        <span>
          <TrophyOutlined style={{ color: rarityColors[r.rarity], marginRight: 8 }} />
          {r.name}
        </span>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'desc',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (v: string) => <Tag>{categoryLabels[v] || v}</Tag>,
    },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      key: 'rarity',
      render: (v: string) => (
        <Tag color={rarityColors[v]}>{rarityLabels[v] || v}</Tag>
      ),
    },
    {
      title: '解锁人数',
      dataIndex: 'unlockCount',
      key: 'count',
      sorter: (a: any, b: any) => a.unlockCount - b.unlockCount,
    },
    {
      title: '解锁率',
      dataIndex: 'unlockRate',
      key: 'rate',
      render: (v: number) => (
        <Progress percent={v} size="small" style={{ width: 100 }} strokeColor="#00d26a" />
      ),
      sorter: (a: any, b: any) => a.unlockRate - b.unlockRate,
    },
  ];

  return (
    <div>
      <Title level={4}>成就系统</Title>

      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={8}>
            <Card size="small">
              <Statistic
                title="总成就数"
                value={stats.total}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={8}>
            <Card size="small">
              <Statistic
                title="最高解锁数（单用户）"
                value={stats.maxUnlocked || 0}
                prefix={<UnlockOutlined />}
                suffix={`/ ${stats.total}`}
              />
            </Card>
          </Col>
          <Col xs={8}>
            <Card size="small">
              <Statistic
                title="有成就的用户"
                value={stats.usersWithAchievements || 0}
                suffix={`人`}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card title="成就解锁统计" size="small">
        <Table
          dataSource={achievementStats}
          columns={columns}
          rowKey="key"
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
}
