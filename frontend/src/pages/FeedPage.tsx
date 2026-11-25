import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  Empty,
  Skeleton,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { getErrorMessage } from '../api/client';
import { getFeed } from '../api/posts';
import type { Post } from '../api/posts';
import { PostCard } from '../components/PostCard';
import { PostComposer } from '../components/PostComposer';
import './FeedPage.css';

const PAGE_SIZE = 10;

export function FeedPage() {
  const { message } = AntApp.useApp();

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async (nextPage: number) => {
    if (nextPage === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const data = await getFeed(nextPage, PAGE_SIZE);
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
  }, []);

  useEffect(() => {
    void load(0);
  }, [load]);

  function handleSaved(_post: Post) {
    // The feed is friends-only, so your own new post appears on your profile.
    message.info('Your post is live on your profile');
  }

  return (
    <div className="feed-page">
      <div className="feed-toolbar">
        <div>
          <Typography.Title level={3} className="feed-title">
            Today
          </Typography.Title>
          <Typography.Text type="secondary">
            Posts from your friends, from today only.
          </Typography.Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setComposerOpen(true)}
        >
          New post
        </Button>
      </div>

      {error && <Alert type="error" showIcon message={error} />}

      {loading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      ) : posts.length === 0 ? (
        <Empty description="You're all caught up — no posts from your friends today." />
      ) : (
        <div className="post-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
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

      <PostComposer
        open={composerOpen}
        post={null}
        onClose={() => setComposerOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}