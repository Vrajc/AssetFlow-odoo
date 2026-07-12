import { create } from 'zustand';
import { api } from '../api/client';
import type { User } from '../lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  loadMe: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('af_token'),
  loading: true,
  setSession: (token, user) => {
    localStorage.setItem('af_token', token);
    set({ token, user, loading: false });
  },
  logout: () => {
    localStorage.removeItem('af_token');
    set({ token: null, user: null, loading: false });
  },
  loadMe: async () => {
    const token = localStorage.getItem('af_token');
    if (!token) {
      set({ loading: false, user: null });
      return;
    }
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data, token, loading: false });
    } catch {
      localStorage.removeItem('af_token');
      set({ user: null, token: null, loading: false });
    }
  },
}));

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  ASSET_MANAGER: 'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE: 'Employee',
};
export const roleLabel = (r?: string) => (r ? ROLE_LABELS[r] ?? r : '');
export const isManager = (r?: string) => r === 'ADMIN' || r === 'ASSET_MANAGER';
export const canApprove = (r?: string) => r === 'ADMIN' || r === 'ASSET_MANAGER' || r === 'DEPARTMENT_HEAD';
