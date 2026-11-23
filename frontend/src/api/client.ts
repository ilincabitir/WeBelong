import axios from 'axios';

const TOKEN_KEY = 'webelong.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 1. Attach the JWT to every outgoing request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Handle expired/invalid sessions in one place.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const url = error.config?.url ?? '';
      const isAuthProbe = url.includes('/auth/login') || url.includes('/auth/me');

      if (status === 401 && !isAuthProbe) {
        clearToken();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  },
);

// 3. One consistent way to turn any failure into a sentence for the user.
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return 'Something went wrong. Please try again.';
}                           