import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, isLoggedIn } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already logged in — redirect immediately
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(account, password);
      navigate('/', { replace: true });
    } catch {
      setError('账号或密码错误');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    setLoading(true);
    try {
      await register(username, password, nickname.trim() || undefined);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err?.error || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setError('');
  };

  return (
    <div className="flex flex-col h-full px-6 justify-center">
      <div className="space-y-2 mb-10 text-center">
        <div className="text-5xl mb-4">🏃</div>
        <h1 className="text-3xl font-bold">RunGoal</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>跑步目标记录 · 成就你的每一步</p>
      </div>

      {/* Tab switcher */}
      <div
        className="flex mb-6 rounded-lg overflow-hidden"
        style={{ background: 'var(--color-surface)' }}
      >
        <button
          type="button"
          className="flex-1 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: activeTab === 'login' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'login' ? '#fff' : 'var(--color-text-secondary)',
          }}
          onClick={() => switchTab('login')}
        >
          登录
        </button>
        <button
          type="button"
          className="flex-1 py-2.5 text-sm font-medium transition-colors"
          style={{
            background: activeTab === 'register' ? 'var(--color-accent)' : 'transparent',
            color: activeTab === 'register' ? '#fff' : 'var(--color-text-secondary)',
          }}
          onClick={() => switchTab('register')}
        >
          注册
        </button>
      </div>

      {/* Login form */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            className="input"
            placeholder="用户名或手机号"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-center" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      )}

      {/* Register form */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            className="input"
            placeholder="用户名（字母、数字、下划线和.，4-16 位）"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="text"
            className="input"
            placeholder="昵称（选填，默认与用户名相同）"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <input
            type="password"
            className="input"
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="text-sm text-center" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
      )}
    </div>
  );
}
