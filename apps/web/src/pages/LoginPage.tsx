import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/useAuthStore';

type Tab = 'login' | 'register';

const features = [
  ['01', '设定目标', '把想跑的路变成清晰计划'],
  ['02', '记录每步', '手动与 GPS 两种记录方式'],
  ['03', '看见进步', '趋势、排行和周期报告'],
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, isLoggedIn } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('login');
  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) navigate('/', { replace: true });
  }, [isLoggedIn, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (activeTab === 'login' && !account.trim()) {
      setError('请输入用户名或手机号');
      return;
    }
    if (activeTab === 'register' && !/^[a-zA-Z0-9_.]{4,16}$/.test(username)) {
      setError('用户名需为 4-16 位字母、数字、下划线或点');
      return;
    }
    if (password.length < 6) {
      setError('密码至少需要 6 位');
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'login') await login(account.trim(), password);
      else await register(username.trim(), password, nickname.trim() || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, activeTab === 'login' ? '账号或密码错误' : '注册失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setError('');
  };

  return (
    <main className="login-page">
      <section className="login-story" aria-label="RunGoal 产品介绍">
        <div className="login-story__glow" />
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">RG</span>
          <span>RunGoal</span>
        </div>
        <div className="login-story__copy">
          <p className="eyebrow">Make every step count</p>
          <h1>不只记录跑步，<br />更记录你变强的过程。</h1>
          <p>目标、轨迹与成长数据，都在一个安静专注的空间里。</p>
        </div>
        <div className="login-story__features">
          {features.map(([number, title, copy]) => (
            <article key={number}>
              <span>{number}</span>
              <div><strong>{title}</strong><small>{copy}</small></div>
            </article>
          ))}
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__mobile-brand brand-lockup">
          <span className="brand-mark">RG</span><span>RunGoal</span>
        </div>
        <div className="login-panel__heading">
          <p className="eyebrow">欢迎回来</p>
          <h2>{activeTab === 'login' ? '继续你的跑步计划' : '从今天开始积累'}</h2>
          <p>{activeTab === 'login' ? '登录后查看目标与最近训练' : '创建账号，建立第一条跑步目标'}</p>
        </div>

        <div className="segmented-control" role="tablist" aria-label="账号操作">
          {(['login', 'register'] as Tab[]).map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab}
              className={activeTab === tab ? 'is-active' : ''} onClick={() => switchTab(tab)}>
              {tab === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="login-form">
          {activeTab === 'register' ? (
            <>
              <label><span>用户名</span><input type="text" className="input" placeholder="4-16 位字母、数字、下划线或点"
                autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
              <label><span>跑者昵称（选填）</span><input type="text" className="input" placeholder="例如：晨风"
                autoComplete="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
            </>
          ) : (
            <label><span>账号</span><input type="text" className="input" placeholder="用户名或手机号"
              autoComplete="username" value={account} onChange={(event) => setAccount(event.target.value)} /></label>
          )}
          <label><span>密码</span><input type="password" className="input" placeholder="至少 6 位"
            autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>

          {error && <div className="form-alert" role="alert">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? '正在连接…' : activeTab === 'login' ? '进入 RunGoal' : '创建账号'}
          </button>
        </form>
        <p className="login-panel__note">每一次出发，都比停在原地更接近目标。</p>
      </section>
    </main>
  );
}
