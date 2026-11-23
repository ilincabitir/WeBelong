import { Avatar, Button, Layout, Space, Typography } from 'antd';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const { Header, Content } = Layout;

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fff',
          borderBottom: '1px solid #ececec',
          paddingInline: 24,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Webelong
        </Typography.Title>

        <Space size="middle">
          <Avatar style={{ background: user?.themeColor }}>
            {user?.displayName?.[0]?.toUpperCase()}
          </Avatar>
          <Typography.Text strong>{user?.displayName}</Typography.Text>
          <Button onClick={handleLogout}>Log out</Button>
        </Space>
      </Header>

      <Content
        style={{ width: '100%', maxWidth: 900, margin: '0 auto', padding: 24 }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
}