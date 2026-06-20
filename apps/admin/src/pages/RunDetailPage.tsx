import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Tag, Spin, Typography, Empty, List } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../lib/api';
import dayjs from 'dayjs';

const { Title } = Typography;

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (api as any).get(`/runs/${id}`).then((res: any) => {
      setRun(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!run) return <Empty description="记录不存在" />;

  const formatPace = (v: number | null) => {
    if (!v) return '-';
    const min = Math.floor(v);
    const sec = Math.round((v - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')} /km`;
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/runs')} style={{ marginBottom: 16 }}>
        返回列表
      </Button>

      <Title level={4}>
        跑步记录详情
        <Tag color={run.source === 'gps' ? 'green' : 'blue'} style={{ marginLeft: 8 }}>
          {run.source === 'gps' ? 'GPS' : '手动录入'}
        </Tag>
      </Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="用户">
            <Button type="link" size="small" onClick={() => navigate(`/users/${run.userId}`)}>
              {run.user?.nickname || '未知'}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="距离">{run.distance.toFixed(2)} km</Descriptions.Item>
          <Descriptions.Item label="时长">{formatDuration(run.duration)}</Descriptions.Item>
          <Descriptions.Item label="配速">{formatPace(run.avgPace)}</Descriptions.Item>
          <Descriptions.Item label="卡路里">{run.calories ? `${run.calories} kcal` : '-'}</Descriptions.Item>
          <Descriptions.Item label="感受">{run.feeling ? ['😫','😓','😐','😊','🔥'][run.feeling - 1] : '-'}</Descriptions.Item>
          <Descriptions.Item label="天气">{run.weather || '-'}</Descriptions.Item>
          <Descriptions.Item label="开始时间">{dayjs(run.startedAt).format('YYYY-MM-DD HH:mm:ss')}</Descriptions.Item>
          <Descriptions.Item label="结束时间">{run.endedAt ? dayjs(run.endedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</Descriptions.Item>
        </Descriptions>
        {run.note && (
          <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 8 }}>
            <strong>备注：</strong>{run.note}
          </div>
        )}
      </Card>

      {/* GPS 轨迹点 */}
      {run.trackPoints && Array.isArray(run.trackPoints) && (
        <Card title={`GPS 轨迹点 (${run.trackPoints.length})`} size="small" style={{ marginBottom: 16 }}>
          <p style={{ color: '#999', fontSize: 12 }}>共 {run.trackPoints.length} 个坐标点（地图展示待接入）</p>
          <List
            size="small"
            dataSource={run.trackPoints.slice(0, 5)}
            renderItem={(point: any, index: number) => (
              <List.Item>
                #{index + 1}: {point.lat?.toFixed(6)}, {point.lng?.toFixed(6)}
                {point.accuracy && <Tag style={{ marginLeft: 8 }}>精度 {Math.round(point.accuracy)}m</Tag>}
              </List.Item>
            )}
          />
          {run.trackPoints.length > 5 && <p style={{ color: '#999', fontSize: 12 }}>... 仅展示前 5 个点</p>}
        </Card>
      )}

      {/* 关联的成就解锁 */}
      {run.goalRecords && run.goalRecords.length > 0 && (
        <Card title="关联目标更新" size="small">
          <List
            size="small"
            dataSource={run.goalRecords}
            renderItem={(gr: any) => (
              <List.Item>
                目标 #{gr.goalId.slice(0, 8)}... 贡献值: {gr.value}
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );
}
