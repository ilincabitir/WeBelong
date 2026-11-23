import {api} from './client';

export interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  themeColor: string;
  fontFamily: string;
  createdAt: string;   
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginBody {
  username: string;
  password: string;
}

export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export async function loginRequest(body: LoginBody): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', body);
  return data;
}

export async function registerRequest(body: RegisterBody): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', body);
  return data;
}

export async function meRequest(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}