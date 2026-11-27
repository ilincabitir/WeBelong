import { api } from './client';
import type { PublicUser } from './users';

export type NotificationType = 'FRIEND_REQUEST' | 'COMMENT';

export interface AppNotification {
  id: number;
  type: NotificationType;
  actor: PublicUser;
  postId: number | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationPage {
  content: AppNotification[];
  page: number;
  size: number;
  totalElements: number;
  last: boolean;
}

export async function getNotifications(
  page = 0,
  size = 20,
): Promise<NotificationPage> {
  const { data } = await api.get<NotificationPage>('/notifications', {
    params: { page, size },
  });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>(
    '/notifications/unread-count',
  );
  return data.count;
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put('/notifications/read-all');
}

export async function clearAllNotifications(): Promise<void> {
  await api.delete('/notifications');
}