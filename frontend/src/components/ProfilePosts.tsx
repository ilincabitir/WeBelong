import { useCallback, useEffect, useState } from 'react';
import { Alert, App as AntApp, Button, Empty, Skeleton, Typography } from 'antd';
import { getErrorMessage } from '../api/client';
import { getUserPosts } from '../api/posts';
import type { Post } from '../api/posts';
import { PostCard } from './PostCard';
import { PostComposer } from './PostComposer';

const PAGE_SIZE = 10;

interface ProfilePostsProps {
  userId: number;
  canManage: boolean;
}

export function ProfilePosts({ userId, canManage }: ProfilePostsProps) {
  const { message } = AntApp.useApp();

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);

  const load = useCallback(
    async (nextPage: number) => {
      if (nextPage === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const data = await getUserPosts(userId, nextPage, PAGE_SIZE);
        setPosts((prev) =>
          nextPage === 0 ? data.content : [...prev, ...data.content],
        );
        setPage(data.page);
        setLast(data.last);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  function handleEdit(post: Post) {
    setEditing(post);
    setComposerOpen(true);
  }

  function handleSaved(saved: Post) {
    setPosts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    message.success('Post updated');
  }

  function handleDeleted(id: number) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="profile-posts">
      <Typography.Title level={4} className="profile-posts-title">
        Posts
      </Typography.Title>

      {error && <Alert type="error" showIcon message={error} />}

      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : posts.length === 0 ? (
        <Empty description="No posts yet" />
      ) : (
        <div className="post-list">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canManage={canManage}
              onEdit={handleEdit}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {!loading && posts.length > 0 && (
        last ? (
          <div className="feed-end">You're all caught up</div>
        ) : (
          <div className="feed-more">
            <Button loading={loadingMore} onClick={() => void load(page + 1)}>
              Load more
            </Button>
          </div>
        )
      )}

      {canManage && (
        <PostComposer
          open={composerOpen}
          post={editing}
          onClose={() => {
            setComposerOpen(false);
            setEditing(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}