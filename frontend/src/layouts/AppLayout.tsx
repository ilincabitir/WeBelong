import type { CSSProperties } from 'react';
import { Avatar, Button, Layout, Space, Typography } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './AppLayout.css';

const { Header, Content } = Layout;

type LayoutStyleVars = CSSProperties & { '--accent': string };

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const layoutVars: LayoutStyleVars = {
    '--accent': user?.themeColor ?? '#1677ff',
  };

  return (
    <Layout className="app-layout" style={layoutVars}>
      <Header className="app-header">
        <Link to="/" className="app-brand">
          <Typography.Title level={4}>Webelong</Typography.Title>
        </Link>

        <Space size="middle">
          <Link to="/profile/me" className="app-user-link">
            <Space size="small">
              <Avatar
                className="app-avatar"
                src={user?.avatarUrl ?? undefined}
              >
                {user?.displayName?.[0]?.toUpperCase()}
              </Avatar>
              <Typography.Text strong>{user?.displayName}</Typography.Text>
            </Space>
          </Link>
          <Button onClick={handleLogout}>Log out</Button>
        </Space>
      </Header>

      <Content className="app-content">
        <Outlet />
      </Content>
    </Layout>
  );
}