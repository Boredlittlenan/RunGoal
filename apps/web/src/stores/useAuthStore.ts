import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string | null;
  weight?: number | null;
  height?: number | null;
  theme: string;
}

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, nickname: string) => Promise<void>;
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

  login: async (phone, password) => {
    const res: any = await api.post('/auth/login', { phone, password });
    const { user, token, refreshToken } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isLoggedIn: true });
  },

  register: async (phone, password, nickname) => {
    const res: any = await api.post('/auth/register', { phone, password, nickname });
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
      const res: any = await api.get('/auth/me');
      const user = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isLoggedIn: true });
    } catch {
      // token 无效
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
