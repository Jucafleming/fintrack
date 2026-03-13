import { api } from './api';
import type { PaymentMethod } from '@/types';

export const paymentMethodsService = {
  async findAll(groupId: string): Promise<PaymentMethod[]> {
    const res = await api.get<PaymentMethod[]>(`/groups/${groupId}/payment-methods`);
    return res.data;
  },

  async create(groupId: string, name: string): Promise<PaymentMethod> {
    const res = await api.post<PaymentMethod>(`/groups/${groupId}/payment-methods`, { name });
    return res.data;
  },

  async update(groupId: string, id: string, name: string): Promise<PaymentMethod> {
    const res = await api.patch<PaymentMethod>(`/groups/${groupId}/payment-methods/${id}`, { name });
    return res.data;
  },

  async remove(groupId: string, id: string): Promise<void> {
    await api.delete(`/groups/${groupId}/payment-methods/${id}`);
  },
};
