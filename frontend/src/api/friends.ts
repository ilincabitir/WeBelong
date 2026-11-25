import { api } from './client';
import type { PublicUser } from './users';

export interface Friendship {
  id: number;
  user: PublicUser;
  status: string;
  createdAt: string;
}

export interface FriendRequests {
  incoming: Friendship[];
  outgoing: Friendship[];
}

export type FriendStatus = 'NONE' | 'OUTGOING' | 'INCOMING' | 'FRIENDS';

export async function getFriends(): Promise<PublicUser[]> {
  const { data } = await api.get<PublicUser[]>('/friends');
  return data;
}

export async function getFriendRequests(): Promise<FriendRequests> {
  const { data } = await api.get<FriendRequests>('/friends/requests');
  return data;
}

export async function sendFriendRequest(userId: number): Promise<Friendship> {
  const { data } = await api.post<Friendship>(`/friends/requests/${userId}`);
  return data;
}

export async function acceptFriendRequest(requestId: number): Promise<Friendship> {
  const { data } = await api.post<Friendship>(`/friends/requests/${requestId}/accept`);
  return data;
}

export async function declineFriendRequest(requestId: number): Promise<void> {
  await api.post(`/friends/requests/${requestId}/decline`);
}

export async function unfriend(userId: number): Promise<void> {
  await api.delete(`/friends/${userId}`);
}

export async function getFriendStatus(userId: number): Promise<FriendStatus> {
  const { data } = await api.get<{ status: FriendStatus }>(`/friends/status/${userId}`);
  return data.status;
}