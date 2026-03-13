import { api } from './api';
import type { Transaction, TransactionType, Ownership } from '@/types';

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  paymentMethodId?: string;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}

export interface CreateTransactionDto {
  title: string;
  amount: number;
  type: TransactionType;
  date: string;
  categoryId?: string;
  paymentMethodId?: string;
  ownership?: Ownership;
  isPaid?: boolean;
  notes?: string;
  installmentCount?: number;
}

export const transactionsService = {
  async findAll(groupId: string, filters?: TransactionFilters): Promise<Transaction[]> {
    const res = await api.get<Transaction[]>(`/groups/${groupId}/transactions`, { params: filters });
    return res.data;
  },

  async create(groupId: string, data: CreateTransactionDto): Promise<Transaction> {
    const res = await api.post<Transaction>(`/groups/${groupId}/transactions`, data);
    return res.data;
  },

  async update(groupId: string, id: string, data: Partial<CreateTransactionDto>): Promise<Transaction> {
    const res = await api.patch<Transaction>(`/groups/${groupId}/transactions/${id}`, data);
    return res.data;
  },

  async remove(groupId: string, id: string): Promise<void> {
    await api.delete(`/groups/${groupId}/transactions/${id}`);
  },
};
