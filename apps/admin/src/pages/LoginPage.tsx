import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, ArrowRightOutlined } from '@ant-design/icons';

interface LoginResponse {
  success: boolean;
  data?: { token: string };
  error?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('admin_token')) navigate('/', { replace: true });
  }, [navigate]);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await response.json() as LoginResponse;
      if (!response.ok || !data.success || !data.data?.token) throw new Error(data.error || '账号或密码错误');
      localStorage.setItem('admin_token', data.data.token);
      message.success('登录成功');
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '网络连接失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login">
      <section className="admin-login__visual">
        <div className="admin-login__brand"><span>RG</span><div><strong>RunGoal</strong><small>CONTROL CENTER</small></div></div>
        <div className="admin-login__message">
          <p>OPERATIONS · 2026</p>
          <h1>让每一条<br />运动数据都清晰可见。</h1>
          <div><span><i />运行状态</span><strong>ALL SYSTEMS<br />OPERATIONAL</strong></div>
        </div>
        <span className="admin-login__circle" />
      </section>

      <section className="admin-login__panel">
        <div className="admin-login__form-wrap">
          <p className="admin-login__eyebrow">Secure access</p>
          <h2>管理员登录</h2>
          <p className="admin-login__lead">进入 RunGoal 运营与数据中心</p>
          <Form onFinish={onFinish} layout="vertical" size="large" requiredMark={false} className="admin-login__form">
            <Form.Item label="管理员账号" name="username" rules={[{ required: true, message: '请输入管理员账号' }]}>
              <Input prefix={<UserOutlined />} placeholder="Username" autoComplete="username" />
            </Form.Item>
            <Form.Item label="登录密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" autoComplete="current-password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block loading={loading} icon={<ArrowRightOutlined />} iconPosition="end">
                进入控制台
              </Button>
            </Form.Item>
          </Form>
          <p className="admin-login__footnote">仅限已授权管理员访问 · 操作将被安全记录</p>
        </div>
      </section>
    </main>
  );
}
