import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Upload,
} from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { getErrorMessage } from '../api/client';
import { createPost, updatePost } from '../api/posts';
import type { Post } from '../api/posts';
import { uploadImage } from '../api/users';
import './PostComposer.css';

const FONTS = [
  'system-ui',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Times New Roman',
];

interface ComposerValues {
  content: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

interface PostComposerProps {
  open: boolean;
  post: Post | null;
  onClose: () => void;
  onSaved: (post: Post) => void;
}

type ComposerVars = CSSProperties & {
  '--post-bg': string;
  '--post-text': string;
  '--post-font': string;
};

export function PostComposer({ open, post, onClose, onSaved }: PostComposerProps) {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm<ComposerValues>();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = Form.useWatch('content', form) ?? '';
  const backgroundColor = Form.useWatch('backgroundColor', form) ?? '#ffffff';
  const textColor = Form.useWatch('textColor', form) ?? '#1f1f1f';
  const fontFamily = Form.useWatch('fontFamily', form) ?? 'system-ui';

  useEffect(() => {
    if (!open) return;

    if (post) {
      form.setFieldsValue({
        content: post.content ?? '',
        backgroundColor: post.backgroundColor,
        textColor: post.textColor,
        fontFamily: post.fontFamily,
      });
      setImageUrl(post.imageUrl);
    } else {
      form.setFieldsValue({
        content: '',
        backgroundColor: '#ffffff',
        textColor: '#1f1f1f',
        fontFamily: 'system-ui',
      });
      setImageUrl(null);
    }

    setError(null);
  }, [open, post, form]);

  const previewVars: ComposerVars = {
    '--post-bg': backgroundColor,
    '--post-text': textColor,
    '--post-font': fontFamily,
  };

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      setImageUrl(await uploadImage(file));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  async function handleFinish(values: ComposerValues) {
    const text = values.content?.trim() ? values.content.trim() : null;

    if (!text && !imageUrl) {
      setError('Write something or add an image.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        content: text,
        imageUrl,
        backgroundColor: values.backgroundColor,
        textColor: values.textColor,
        fontFamily: values.fontFamily,
      };

      const saved = post
        ? await updatePost(post.id, body)
        : await createPost(body);

      message.success(post ? 'Post updated' : 'Post published');
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={post ? 'Edit post' : 'New post'}
      open={open}
      onCancel={onClose}
      footer={null}
      width={580}
    >
      {error && (
        <Alert
          className="composer-alert"
          type="error"
          showIcon
          message={error}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleFinish}
      >
        <Form.Item
          name="content"
          rules={[{ max: 2000, message: 'Maximum 2000 characters' }]}
        >
          <Input.TextArea
            rows={4}
            maxLength={2000}
            showCount
            placeholder="What's on your mind?"
          />
        </Form.Item>

        <Form.Item label="Image">
          <Space direction="vertical" size="small">
            {imageUrl && (
              <img className="composer-image" src={imageUrl} alt="" />
            )}
            <Space>
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                showUploadList={false}
                beforeUpload={(file) => {
                  void handleUpload(file);
                  return false;
                }}
              >
                <Button icon={<PictureOutlined />} loading={uploading}>
                  {imageUrl ? 'Replace image' : 'Add image'}
                </Button>
              </Upload>
              {imageUrl && (
                <Button onClick={() => setImageUrl(null)}>Remove</Button>
              )}
            </Space>
          </Space>
        </Form.Item>

        <div className="composer-row">
          <Form.Item name="backgroundColor" label="Background">
            <input type="color" className="composer-color" />
          </Form.Item>
          <Form.Item name="textColor" label="Text colour">
            <input type="color" className="composer-color" />
          </Form.Item>
          <Form.Item name="fontFamily" label="Font">
            <Select
              options={FONTS.map((font) => ({ label: font, value: font }))}
            />
          </Form.Item>
        </div>

        <div className="composer-preview" style={previewVars}>
          <div className="composer-preview-label">Preview</div>
          <div className="composer-preview-content">
            {content || 'Your post preview'}
          </div>
          {imageUrl && (
            <img className="composer-preview-image" src={imageUrl} alt="" />
          )}
        </div>

        <div className="composer-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            disabled={uploading}
          >
            {post ? 'Save changes' : 'Post'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}