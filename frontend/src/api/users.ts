import { api } from './client';
import type { User } from './auth';

export interface PublicUser {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  themeColor: string;
  fontFamily: string;
  createdAt: string;
}

export interface UpdateProfileBody {
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  themeColor: string;
  fontFamily: string;
}

export async function getUser(id: number | string): Promise<PublicUser> {
  const { data } = await api.get<PublicUser>(`/users/${id}`);
  return data;
}

export async function updateMe(body: UpdateProfileBody): Promise<User> {
  const { data } = await api.put<User>('/users/me', body);
  return data;
}

export async function searchUsers(q: string): Promise<PublicUser[]> {
  const { data } = await api.get<PublicUser[]>('/users', { params: { q } });
  return data;
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<{ url: string }>('/files/upload', form);
  return data.url;
}