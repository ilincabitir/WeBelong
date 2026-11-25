import type { CSSProperties } from 'react';
import { Avatar, Button, Layout, Typography } from 'antd';
import {
  HomeOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './AppLayout.css';

const { Header, Content } = Layout;

type LayoutStyleVars = CSSProperties & { '--accent': string };

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const layoutVars: LayoutStyleVars = {
    '--accent': user?.themeColor ?? '#1677ff',
  };

  const onProfile = location.pathname.startsWith('/profile');

  return (
    <Layout className="app-layout" style={layoutVars}>
      <Header className="app-header">
        <Link to="/" className="app-brand">
          <Typography.Title level={4}>Webelong</Typography.Title>
        </Link>

        <nav className="app-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <HomeOutlined />
            <span className="app-nav-label">Feed</span>
          </NavLink>

          <NavLink
            to="/friends"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <TeamOutlined />
            <span className="app-nav-label">Friends</span>
          </NavLink>

        
        </nav>

        <div className="app-user-area">
          <Link to="/profile/me" className="app-user-link">
            <Avatar
              className="app-avatar"
              src={user?.avatarUrl ?? undefined}
            >
              {user?.displayName?.[0]?.toUpperCase()}
            </Avatar>
            <Typography.Text strong className="app-user-name">
              {user?.displayName}
            </Typography.Text>
          </Link>

          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </Header>

      <Content className="app-content">
        <Outlet />
      </Content>
    </Layout>
  );
}
