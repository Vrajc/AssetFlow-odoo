import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('af_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      localStorage.removeItem('af_token');
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/** Extract a friendly message + code from an axios error. */
export function apiError(err: unknown): { code: string; message: string; details?: any } {
  const e = err as any;
  if (e?.response?.data?.error) return e.response.data.error;
  return { code: 'UNKNOWN', message: e?.message ?? 'Something went wrong' };
}

export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}
