import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 调用登录 API
    navigate('/');
  };

  return (
    <div className="flex flex-col h-full px-6 justify-center">
      <div className="space-y-2 mb-10 text-center">
        <div className="text-5xl mb-4">🏃</div>
        <h1 className="text-3xl font-bold">RunGoal</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>跑步目标记录 · 成就你的每一步</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="tel"
          className="input"
          placeholder="手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
        <button type="submit" className="btn-primary w-full">
          登录
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-secondary)' }}>
        还没有账号？
        <button className="ml-1 font-medium" style={{ color: 'var(--color-accent)' }}>
          立即注册
        </button>
      </p>
    </div>
  );
}
