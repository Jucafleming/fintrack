import { api } from './api';
import type { Category } from '@/types';

export const categoriesService = {
  async findAll(groupId: string): Promise<Category[]> {
    const res = await api.get<Category[]>(`/groups/${groupId}/categories`);
    return res.data;
  },

  async create(groupId: string, data: { name: string; color?: string }): Promise<Category> {
    const res = await api.post<Category>(`/groups/${groupId}/categories`, data);
    return res.data;
  },

  async update(groupId: string, id: string, data: { name?: string; color?: string }): Promise<Category> {
    const res = await api.patch<Category>(`/groups/${groupId}/categories/${id}`, data);
    return res.data;
  },

  async remove(groupId: string, id: string): Promise<void> {
    await api.delete(`/groups/${groupId}/categories/${id}`);
  },
};
