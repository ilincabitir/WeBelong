import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Card,
  Input,
  Popconfirm,
  Typography,
  Upload,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  MessageOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import {
  addComment,
  deleteComment,
  deletePost,
  getComments,
} from '../api/posts';
import type { Comment, Post } from '../api/posts';
import { uploadImage } from '../api/users';
import { useAuth } from '../auth/AuthContext';
import { timeAgo } from '../lib/time';
import './PostCard.css';

interface PostCardProps {
  post: Post;
  canManage?: boolean;
  onEdit?: (post: Post) => void;
  onDeleted?: (postId: number) => void;
}

type PostVars = CSSProperties & {
  '--post-bg': string;
  '--post-text': string;
  '--post-font': string;
};

export function PostCard({
  post,
  canManage = false,
  onEdit,
  onDeleted,
}: PostCardProps) {
  const { user: me } = useAuth();
  const { message, modal } = AntApp.useApp();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [commentUploading, setCommentUploading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    if (!commentsOpen) return;

    let active = true;
    setCommentsLoading(true);
    setCommentsError(null);

    getComments(post.id)
      .then((data) => {
        if (active) setComments(data);
      })
      .catch((e) => {
        if (active) setCommentsError(getErrorMessage(e));
      })
      .finally(() => {
        if (active) setCommentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [commentsOpen, post.id]);

  const postVars: PostVars = {
    '--post-bg': post.backgroundColor,
    '--post-text': post.textColor,
    '--post-font': post.fontFamily,
  };

  function confirmDeletePost() {
    modal.confirm({
      title: 'Delete this post?',
      content: 'Its comments will be deleted too.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deletePost(post.id);
          message.success('Post deleted');
          onDeleted?.(post.id);
        } catch (e) {
          message.error(getErrorMessage(e));
        }
      },
    });
  }

  async function handleCommentUpload(file: File) {
    setCommentUploading(true);
    try {
      setCommentImage(await uploadImage(file));
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setCommentUploading(false);
    }
  }

  async function submitComment() {
    const text = commentText.trim() ? commentText.trim() : null;
    if (!text && !commentImage) {
      message.warning('Write something or add an image');
      return;
    }

    setCommentSubmitting(true);
    try {
      const created = await addComment(post.id, {
        content: text,
        imageUrl: commentImage,
      });
      setComments((prev) => [...prev, created]);
      setCommentText('');
      setCommentImage(null);
      message.success('Comment added');
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function removeComment(commentId: number) {
    try {
      await deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      message.success('Comment deleted');
    } catch (e) {
      message.error(getErrorMessage(e));
    }
  }

  return (
    <Card className="post-card" style={postVars}>
      <div className="post-head">
        <Link to={`/profile/${post.author.id}`} className="post-author">
          <Avatar
            src={post.author.avatarUrl ?? undefined}
            style={{ background: post.author.themeColor }}
          >
            {post.author.displayName?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Typography.Text strong>{post.author.displayName}</Typography.Text>
            <Typography.Text type="secondary" className="post-time">
              {timeAgo(post.createdAt)}
            </Typography.Text>
          </div>
        </Link>

        {canManage && (
          <div className="post-manage">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit?.(post)}
            />
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={confirmDeletePost}
            />
          </div>
        )}
      </div>

      {post.content && (
        <Typography.Paragraph className="post-content">
          {post.content}
        </Typography.Paragraph>
      )}

      {post.imageUrl && (
        <img className="post-image" src={post.imageUrl} alt="" />
      )}

      <div className="post-actions">
        <Button
          type="text"
          icon={<MessageOutlined />}
          onClick={() => setCommentsOpen((value) => !value)}
        >
          Comments
          {commentsOpen && comments.length > 0 ? ` (${comments.length})` : ''}
        </Button>
      </div>

      {commentsOpen && (
        <div className="comments">
          {commentsLoading && (
            <Typography.Text type="secondary">Loading comments…</Typography.Text>
          )}

          {commentsError && (
            <Alert type="error" showIcon message={commentsError} />
          )}

          {!commentsLoading && !commentsError && comments.length === 0 && (
            <Typography.Text type="secondary">No comments yet.</Typography.Text>
          )}

          {comments.map((comment) => (
            <div className="comment" key={comment.id}>
              <Avatar
                size={32}
                src={comment.author.avatarUrl ?? undefined}
                style={{ background: comment.author.themeColor }}
              >
                {comment.author.displayName?.[0]?.toUpperCase()}
              </Avatar>

              <div className="comment-body">
                <div className="comment-head">
                  <Link
                    to={`/profile/${comment.author.id}`}
                    className="comment-author"
                  >
                    <Typography.Text strong>
                      {comment.author.displayName}
                    </Typography.Text>
                  </Link>
                  <Typography.Text type="secondary" className="comment-time">
                    {timeAgo(comment.createdAt)}
                  </Typography.Text>
                </div>

                {comment.content && (
                  <Typography.Paragraph className="comment-content">
                    {comment.content}
                  </Typography.Paragraph>
                )}

                {comment.imageUrl && (
                  <img className="comment-image" src={comment.imageUrl} alt="" />
                )}
              </div>

              {(me?.id === comment.author.id || me?.id === post.author.id) && (
                <Popconfirm
                  title="Delete this comment?"
                  okText="Delete"
                  onConfirm={() => void removeComment(comment.id)}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </div>
          ))}

          <div className="comment-form">
            {commentImage && (
              <div className="comment-image-preview">
                <img src={commentImage} alt="" />
                <Button size="small" onClick={() => setCommentImage(null)}>
                  Remove
                </Button>
              </div>
            )}

            <Input.TextArea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Write a comment…"
            />

            <div className="comment-actions">
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif"
                showUploadList={false}
                beforeUpload={(file) => {
                  void handleCommentUpload(file);
                  return false;
                }}
              >
                <Button icon={<PictureOutlined />} loading={commentUploading}>
                  Image
                </Button>
              </Upload>

              <Button
                type="primary"
                loading={commentSubmitting}
                onClick={() => void submitComment()}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}