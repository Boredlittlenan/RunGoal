import { useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme, Button } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  CarryOutOutlined,
  TrophyOutlined,
  AimOutlined,
  ThunderboltOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/runs', icon: <CarryOutOutlined />, label: '跑步记录' },
  { key: '/goals', icon: <AimOutlined />, label: '目标管理' },
  { key: '/achievements', icon: <TrophyOutlined />, label: '成就系统' },
  { key: '/challenges', icon: <ThunderboltOutlined />, label: '挑战管理' },
];

const pageTitles: Record<string, { eyebrow: string; title: string }> = {
  '/': { eyebrow: 'Overview', title: '数据总览' },
  '/users': { eyebrow: 'People', title: '用户管理' },
  '/runs': { eyebrow: 'Activity', title: '跑步记录' },
  '/goals': { eyebrow: 'Targets', title: '目标管理' },
  '/achievements': { eyebrow: 'Motivation', title: '成就系统' },
  '/challenges': { eyebrow: 'Campaigns', title: '挑战管理' },
};

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  if (!localStorage.getItem('admin_token')) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  // 匹配当前路径到菜单
  const selectedKey = menuItems.find(
    (item) => location.pathname === item.key || (item.key !== '/' && location.pathname.startsWith(item.key))
  )?.key || '/';
  const pageMeta = pageTitles[selectedKey] ?? pageTitles['/'];

  return (
    <Layout className="admin-shell">
      <Sider trigger={null} collapsible collapsed={collapsed} breakpoint="lg" width={232} className="admin-sider">
        <div className={`admin-brand ${collapsed ? 'is-collapsed' : ''}`}>
          <span>RG</span>{!collapsed && <div><strong>RunGoal</strong><small>CONTROL CENTER</small></div>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout className="admin-workspace">
        <Header
          className="admin-header"
          style={{
            background: colorBgContainer,
          }}
        >
          <div className="admin-header__left">
            <Button type="text" className="admin-collapse" aria-label={collapsed ? '展开导航' : '收起导航'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
            <div><small>{pageMeta.eyebrow}</small><strong>{pageMeta.title}</strong></div>
          </div>
          <div className="admin-header__right"><span className="admin-status"><i /> 服务运行中</span><Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>退出</Button></div>
        </Header>

        <Content
          style={{
            margin: 20,
            padding: 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
          className="admin-content"
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
