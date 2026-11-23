import { useState } from 'react';
import { Alert, App as AntApp, Button, Card, Form, Input, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface LoginFormValues {
  username: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onFinish(values: LoginFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await login(values.username, values.password);
      message.success('Welcome back!');
      navigate('/', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: 380 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Welcome back
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Log in to see what your friends shared today.
        </Typography.Paragraph>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
        )}

        <Form<LoginFormValues> layout="vertical" requiredMark={false} onFinish={onFinish}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Enter your username' }]}
          >
            <Input autoComplete="username" autoFocus />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter your password' }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            Log in
          </Button>
        </Form>

        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          No account? <Link to="/register">Create one</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
}