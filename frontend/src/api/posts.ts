import { api } from './client';
import type { PublicUser } from './users';

export interface Post {
  id: number;
  author: PublicUser;
  content: string | null;
  imageUrl: string | null;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: number;
  author: PublicUser;
  content: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  last: boolean;
}

export interface PostBody {
  content: string | null;
  imageUrl: string | null;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
}

export interface CommentBody {
  content: string | null;
  imageUrl: string | null;
}

export async function createPost(body: PostBody): Promise<Post> {
  const { data } = await api.post<Post>('/posts', body);
  return data;
}

export async function updatePost(id: number, body: PostBody): Promise<Post> {
  const { data } = await api.put<Post>(`/posts/${id}`, body);
  return data;
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/posts/${id}`);
}

export async function getPost(id: number): Promise<Post> {
  const { data } = await api.get<Post>(`/posts/${id}`);
  return data;
}

export async function getFeed(page = 0, size = 10): Promise<PageResponse<Post>> {
  const { data } = await api.get<PageResponse<Post>>('/feed', {
    params: { page, size },
  });
  return data;
}

export async function getUserPosts(
  userId: number | string,
  page = 0,
  size = 10,
): Promise<PageResponse<Post>> {
  const { data } = await api.get<PageResponse<Post>>(`/users/${userId}/posts`, {
    params: { page, size },
  });
  return data;
}

export async function getComments(postId: number): Promise<Comment[]> {
  const { data } = await api.get<Comment[]>(`/posts/${postId}/comments`);
  return data;
}

export async function addComment(
  postId: number,
  body: CommentBody,
): Promise<Comment> {
  const { data } = await api.post<Comment>(`/posts/${postId}/comments`, body);
  return data;
}

export async function deleteComment(
  postId: number,
  commentId: number,
): Promise<void> {
  await api.delete(`/posts/${postId}/comments/${commentId}`);
}