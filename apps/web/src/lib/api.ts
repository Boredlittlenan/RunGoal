import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface TokenPair {
  token: string;
  refreshToken: string;
}

const api = axios.create({ baseURL: '/api', timeout: 15000 });
let refreshRequest: Promise<TokenPair> | null = null;

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

function redirectToLogin() {
  clearSession();
  if (window.location.pathname !== '/login') window.location.assign('/login');
}

function requestTokenRefresh(refreshToken: string): Promise<TokenPair> {
  if (!refreshRequest) {
    refreshRequest = axios
      .post<ApiEnvelope<TokenPair>>('/api/auth/refresh', { refreshToken })
      .then(({ data }) => data.data)
      .finally(() => { refreshRequest = null; });
  }
  return refreshRequest;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error.response.data ?? error);
      }

      try {
        const tokens = await requestTokenRefresh(refreshToken);
        localStorage.setItem('token', tokens.token);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${tokens.token}`;
        return api(originalRequest);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error.response?.data ?? error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = '操作失败，请稍后重试'): string {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { error?: unknown; message?: unknown };
    if (typeof candidate.error === 'string' && candidate.error.trim()) return candidate.error;
    if (typeof candidate.message === 'string' && candidate.message.trim() && candidate.message !== 'Network Error') {
      return candidate.message;
    }
  }
  return fallback;
}

/** Serialize a local Date for chrono::NaiveDateTime without an accidental UTC shift. */
export function toNaiveIso(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default api;
