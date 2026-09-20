'use client';

import { create } from 'zustand';
import { apiFetch } from '@/lib/client/api';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: AppUser | null;
  status: 'loading' | 'authed' | 'guest';
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',
  init: async () => {
    try {
      const { user } = await apiFetch<{ user: AppUser | null }>('/api/auth/me');
      set({ user, status: user ? 'authed' : 'guest' });
    } catch {
      set({ user: null, status: 'guest' });
    }
  },
  login: async (email, password) => {
    const { user } = await apiFetch<{ user: AppUser }>('/api/auth/login', {
      method: 'POST',
      json: { email, password },
    });
    set({ user, status: 'authed' });
  },
  register: async (name, email, password) => {
    const { user } = await apiFetch<{ user: AppUser }>('/api/auth/register', {
      method: 'POST',
      json: { name, email, password },
    });
    set({ user, status: 'authed' });
  },
  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      set({ user: null, status: 'guest' });
    }
  },
}));
