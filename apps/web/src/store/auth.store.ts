import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, tokens) =>
        set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, isAuthenticated: true }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    {
      name: 'fintrack-auth',
    },
  ),
);
