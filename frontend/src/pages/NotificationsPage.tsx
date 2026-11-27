import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  App as AntApp,
  Avatar,
  Button,
  Card,
  Empty,
  Popconfirm,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import {
  CheckOutlined,
  CommentOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import {
  clearAllNotifications,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notifications';
import type { AppNotification } from '../api/notifications';
import { useNotifications } from '../notifications/NotificationsContext';
import { timeAgo } from '../lib/time';
import './NotificationsPage.css';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const { unreadCount, refreshUnread } = useNotifications();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number) => {
    if (nextPage === 0) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const data = await getNotifications(nextPage, PAGE_SIZE);
      setItems((prev) =>
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

  async function openNotification(notification: AppNotification) {
    if (!notification.read) {
      try {
        await markNotificationRead(notification.id);
        setItems((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
        await refreshUnread();
      } catch (e) {
        message.error(getErrorMessage(e));
        return;
      }
    }

    navigate(
      notification.type === 'FRIEND_REQUEST'
        ? '/friends?tab=requests'
        : '/profile/me',
    );
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      await refreshUnread();
      message.success('All notifications marked as read');
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    try {
      await clearAllNotifications();
      setItems([]);
      setPage(0);
      setLast(true);
      await refreshUnread();
      message.success('Notifications cleared');
    } catch (e) {
      message.error(getErrorMessage(e));
    } finally {
      setClearing(false);
    }
  }

  return (
    <Card className="notifications-card">
      <div className="notifications-header">
        <div>
          <Typography.Title level={3} className="notifications-title">
            Notifications
          </Typography.Title>
          <Typography.Text type="secondary">
            {unreadCount > 0 ? `${unreadCount} unread` : ''}
          </Typography.Text>
        </div>

        <Space wrap>
          <Button
            icon={<CheckOutlined />}
            loading={markingAll}
            disabled={unreadCount === 0 || clearing}
            onClick={() => void handleMarkAll()}
          >
            Mark all as read
          </Button>

          <Popconfirm
            title="Clear all notifications?"
            description="Every notification will be deleted permanently."
            okText="Clear all"
            okButtonProps={{ danger: true }}
            disabled={items.length === 0}
            onConfirm={() => void handleClearAll()}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={clearing}
              disabled={items.length === 0 || markingAll}
            >
              Clear all
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {error && (
        <Alert
          className="notifications-error"
          type="error"
          showIcon
          message={error}
        />
      )}

      {loading ? (
        <div className="notifications-loading">
          <Skeleton active avatar paragraph={{ rows: 3 }} />
        </div>
      ) : items.length === 0 ? (
        <div className="notifications-empty">
          <Empty description="You're all caught up." />
        </div>
      ) : (
        <div className="notifications-list">
          {items.map((notification) => (
            <div
              key={notification.id}
              className={`notification-row ${
                notification.read ? 'is-read' : 'is-unread'
              }`}
              role="button"
              tabIndex={0}
              onClick={() => void openNotification(notification)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void openNotification(notification);
                }
              }}
            >
              <span className="notification-icon">
                {notification.type === 'FRIEND_REQUEST' ? (
                  <TeamOutlined />
                ) : (
                  <CommentOutlined />
                )}
              </span>

              <Avatar
                src={notification.actor.avatarUrl ?? undefined}
                style={{ background: notification.actor.themeColor }}
              >
                {notification.actor.displayName?.[0]?.toUpperCase()}
              </Avatar>

              <div className="notification-body">
                <Typography.Text>
                  <strong>{notification.actor.displayName}</strong>{' '}
                  {notification.type === 'FRIEND_REQUEST'
                    ? 'sent you a friend request.'
                    : 'commented on your post.'}
                </Typography.Text>
                <Typography.Text
                  type="secondary"
                  className="notification-time"
                >
                  {timeAgo(notification.createdAt)}
                </Typography.Text>
              </div>

              <span className="notification-action">
                {notification.type === 'FRIEND_REQUEST'
                  ? 'View requests'
                  : 'View post'}{' '}
                →
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length > 0 && !last && (
        <div className="notifications-footer">
          <Button loading={loadingMore} onClick={() => void load(page + 1)}>
            Load more
          </Button>
        </div>
      )}
    </Card>
  );
}