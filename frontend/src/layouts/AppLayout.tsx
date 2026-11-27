import { useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Avatar, Badge, Button, Layout, Typography } from 'antd';
import {
  BellOutlined,
  HomeOutlined,
  LogoutOutlined,
  TeamOutlined,

} from '@ant-design/icons';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  NotificationsProvider,
  useNotifications,
} from '../notifications/NotificationsContext';
import './AppLayout.css';

const { Header, Content } = Layout;

type LayoutStyleVars = CSSProperties & { '--accent': string };

export function AppLayout() {
  return (
    <NotificationsProvider>
      <AppShell />
    </NotificationsProvider>
  );
}

function AppShell() {
  const { user, logout } = useAuth();
  const { unreadCount, refreshUnread } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the badge honest whenever the user navigates.
  useEffect(() => {
    void refreshUnread();
  }, [location.pathname, refreshUnread]);

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

          <NavLink
            to="/notifications"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <Badge count={unreadCount} size="small" offset={[2, -2]}>
              <BellOutlined />
            </Badge>
            <span className="app-nav-label">Notifications</span>
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