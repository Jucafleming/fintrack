import { api } from './api';
import type { LoginResponse, User, AuthTokens } from '@/types';

export const authService = {
  async register(data: { name: string; email: string; password: string }): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/register', data);
    return res.data;
  },

  async login(data: { email: string; password: string }): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', data);
    return res.data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
    return res.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },
};
