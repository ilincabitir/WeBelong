import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Input,
  Select,
  Skeleton,
  Space,
  Typography,
  Upload,
} from 'antd';
import { EditOutlined, UploadOutlined, UserOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getErrorMessage } from '../api/client';
import { getUser, updateMe, uploadImage } from '../api/users';
import type { PublicUser } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import './ProfilePage.css';

const FONTS = [
  'system-ui',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Times New Roman',
];

interface ProfileFormValues {
  displayName: string;
  bio: string;
  themeColor: string;
  fontFamily: string;
}


type ProfileStyleVars = CSSProperties & {
  '--accent': string;
  '--accent-soft': string;
  '--profile-font': string;
};

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: me, refreshUser } = useAuth();
  const { message } = AntApp.useApp();

  const isMe = !id || id === 'me' || (me !== null && Number(id) === me.id);
  const profileId = isMe ? me?.id : id;

  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);

  const [form] = Form.useForm<ProfileFormValues>();

  useEffect(() => {
    let active = true;

    if (profileId === undefined) {
      setLoading(false);
      setLoadError('Could not resolve this profile.');
      return;
    }

    setLoading(true);
    setLoadError(null);

    getUser(profileId)
      .then((data) => {
        if (!active) return;
        setProfile(data);
        setAvatarUrl(data.avatarUrl);
        setCoverUrl(data.coverUrl);
      })
      .catch((error) => {
        if (active) setLoadError(getErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profileId]);

  function openEdit() {
    if (!profile) return;
    form.setFieldsValue({
      displayName: profile.displayName,
      bio: profile.bio ?? '',
      themeColor: profile.themeColor,
      fontFamily: profile.fontFamily,
    });
    setAvatarUrl(profile.avatarUrl);
    setCoverUrl(profile.coverUrl);
    setFormError(null);
    setOpen(true);
  }

  async function handleUpload(file: File, target: 'avatar' | 'cover') {
    setUploading(target);
    setFormError(null);
    try {
      const url = await uploadImage(file);
      if (target === 'avatar') setAvatarUrl(url);
      else setCoverUrl(url);
      message.success(target === 'avatar' ? 'Avatar uploaded' : 'Cover uploaded');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setUploading(null);
    }
  }

  async function handleSave(values: ProfileFormValues) {
    if (profileId === undefined) return;

    setSaving(true);
    setFormError(null);
    try {
      await updateMe({
        displayName: values.displayName,
        bio: values.bio?.trim() ? values.bio.trim() : null,
        avatarUrl,
        coverUrl,
        themeColor: values.themeColor,
        fontFamily: values.fontFamily,
      });
      await refreshUser();
      const refreshed = await getUser(profileId);
      setProfile(refreshed);
      setOpen(false);
      message.success('Profile updated');
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <Skeleton active avatar paragraph={{ rows: 4 }} />;
      </Card>
    );
  }

  if (loadError) {
    return <Alert type="error" showIcon message={loadError} />;
  }

  if (!profile) {
    return <Empty description="User not found" />;
  }

  const pageVars: ProfileStyleVars = {
    '--accent': profile.themeColor,
    '--accent-soft': `${profile.themeColor}55`,
    '--profile-font': profile.fontFamily,
  };

  return (
    <>
      <div className="profile-page" style={pageVars}>
        <Card className="profile-card">
          <div className="profile-cover">
            {coverUrl && (
              <img className="profile-cover-img" src={coverUrl} alt="" />
            )}
          </div>

          <div className="profile-body">
            <div className="profile-avatar-row">
              <Avatar
                className="profile-avatar"
                size={96}
                src={avatarUrl ?? undefined}
              >
                {profile.displayName?.[0]?.toUpperCase()}
              </Avatar>
            </div>

            <div className="profile-head">
              <div>
                <Typography.Title level={3} className="profile-name">
                  {profile.displayName}
                </Typography.Title>
                <Typography.Text type="secondary">
                  @{profile.username}
                </Typography.Text>
                <div className="profile-accent-bar" />
              </div>

              {isMe ? (
                <Button type="primary" icon={<EditOutlined />} onClick={openEdit}>
                  Edit profile
                </Button>
              ) : (
                <Button disabled>Add friend</Button>
              )}
            </div>

            {profile.bio && (
              <Typography.Paragraph className="profile-bio">
                {profile.bio}
              </Typography.Paragraph>
            )}

            <Typography.Text type="secondary">
              Joined {dayjs(profile.createdAt).format('MMMM YYYY')}
            </Typography.Text>
          </div>
        </Card>
      </div>

      <Drawer
        title="Edit profile"
        width={440}
        open={open}
        onClose={() => setOpen(false)}
      >
        {formError && (
          <Alert
            className="profile-alert"
            type="error"
            showIcon
            message={formError}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSave}
        >
          <Form.Item label="Avatar">
            <Space align="center" size="middle">
              <Avatar
                className="profile-avatar-placeholder"
                size={64}
                src={avatarUrl ?? undefined}
                icon={!avatarUrl ? <UserOutlined /> : undefined}
              />
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                showUploadList={false}
                beforeUpload={(file) => {
                  void handleUpload(file, 'avatar');
                  return false;
                }}
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={uploading === 'avatar'}
                >
                  Upload avatar
                </Button>
              </Upload>
            </Space>
          </Form.Item>

          <Form.Item label="Cover image">
            <Space direction="vertical" size="small" className="profile-upload-block">
              <div className="profile-cover-preview">
                {coverUrl && (
                  <img className="profile-cover-img" src={coverUrl} alt="" />
                )}
              </div>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                showUploadList={false}
                beforeUpload={(file) => {
                  void handleUpload(file, 'cover');
                  return false;
                }}
              >
                <Button
                  icon={<UploadOutlined />}
                  loading={uploading === 'cover'}
                >
                  Upload cover
                </Button>
              </Upload>
            </Space>
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display name"
            rules={[
              { required: true, message: 'Enter a display name' },
              { max: 60, message: 'Maximum 60 characters' },
            ]}
          >
            <Input maxLength={60} showCount />
          </Form.Item>

          <Form.Item
            name="bio"
            label="Bio"
            rules={[{ max: 300, message: 'Maximum 300 characters' }]}
          >
            <Input.TextArea rows={4} maxLength={300} showCount />
          </Form.Item>

          <Form.Item
            name="themeColor"
            label="Theme colour"
            rules={[{ required: true, message: 'Pick a colour' }]}
          >
            <input type="color" className="profile-color-input" />
          </Form.Item>

          <Form.Item
            name="fontFamily"
            label="Font"
            rules={[{ required: true, message: 'Pick a font' }]}
          >
            <Select
              options={FONTS.map((font) => ({ label: font, value: font }))}
            />
          </Form.Item>

          <Space className="profile-form-actions">
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={uploading !== null}
            >
              Save changes
            </Button>
          </Space>
        </Form>
      </Drawer>
    </>
  );
}