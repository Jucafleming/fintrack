import { api } from './api';
import type { Budget } from '@/types';

export const budgetsService = {
  async findAll(groupId: string, params?: { month?: number; year?: number }): Promise<Budget[]> {
    const res = await api.get<Budget[]>(`/groups/${groupId}/budgets`, { params });
    return res.data;
  },

  async create(groupId: string, data: { categoryId: string; month: number; year: number; limitAmount: number }): Promise<Budget> {
    const res = await api.post<Budget>(`/groups/${groupId}/budgets`, data);
    return res.data;
  },

  async update(groupId: string, id: string, limitAmount: number): Promise<Budget> {
    const res = await api.patch<Budget>(`/groups/${groupId}/budgets/${id}`, { limitAmount });
    return res.data;
  },

  async remove(groupId: string, id: string): Promise<void> {
    await api.delete(`/groups/${groupId}/budgets/${id}`);
  },
};
