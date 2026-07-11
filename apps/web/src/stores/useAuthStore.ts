import { create } from 'zustand';
import api, { type ApiEnvelope } from '@/lib/api';

export interface User {
  id: string;
  username: string;
  phone: string;
  nickname: string;
  avatar?: string | null;
  weight?: number | null;
  height?: number | null;
  theme: string;
}

interface AuthPayload {
  user: User;
  token: string;
  refreshToken: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  login: (account: string, password: string) => Promise<void>;
  register: (username: string, password: string, nickname?: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })(),
  isLoggedIn: !!localStorage.getItem('token'),

  login: async (account, password) => {
    const res = await api.post('/auth/login', { account, password }) as unknown as ApiEnvelope<AuthPayload>;
    const { user, token, refreshToken } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  register: async (username, password, nickname) => {
    const res = await api.post('/auth/register', { username, password, nickname }) as unknown as ApiEnvelope<AuthPayload>;
    const { user, token, refreshToken } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, isLoggedIn: false });
    window.location.href = '/login';
  },

  fetchUser: async () => {
    try {
      const res = await api.get('/auth/me') as unknown as ApiEnvelope<User>;
      const user = res?.data ?? res;
      if (user && user.id) {
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, isLoggedIn: true });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        set({ user: null, isLoggedIn: false });
      }
    } catch (error) {
      // 认证失效由 API 层统一清理；临时网络错误不应让用户退出登录。
      if (!localStorage.getItem('token')) set({ user: null, isLoggedIn: false });
      console.warn('Unable to refresh user profile', error);
    }
  },

  updateUser: (data) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...data };
      localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));
