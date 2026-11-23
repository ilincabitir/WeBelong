import { useState } from 'react';
import { Alert, App as AntApp, Button, Card, Form, Input, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

interface RegisterFormValues {
  username: string;
  email: string;
  displayName: string;
  password: string;
  confirm: string;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { message } = AntApp.useApp();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onFinish(values: RegisterFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await register({
        username: values.username,
        email: values.email,
        displayName: values.displayName,
        password: values.password,
      });
      message.success('Account created');
      navigate('/', { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: 420 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Create your account
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          A quieter place for real friendships.
        </Typography.Paragraph>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
        )}

        <Form<RegisterFormValues> layout="vertical" requiredMark={false} onFinish={onFinish}>
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Choose a username' },
              { pattern: /^[A-Za-z0-9_]{3,30}$/, message: '3-30 letters, digits or underscores' },
            ]}
          >
            <Input autoComplete="username" autoFocus />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter your email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input autoComplete="email" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display name"
            rules={[
              { required: true, message: 'Enter a display name' },
              { max: 60, message: 'Maximum 60 characters' },
            ]}
          >
            <Input autoComplete="name" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Choose a password' },
              { min: 8, message: 'At least 8 characters' },
              { max: 72, message: 'Maximum 72 characters' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Repeat your password' },
              ({ getFieldValue }) => ({
                validator(_, value: string) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={submitting}>
            Create account
          </Button>
        </Form>

        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          Already registered? <Link to="/login">Log in</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
}