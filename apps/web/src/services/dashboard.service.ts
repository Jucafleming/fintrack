import { api } from './api';
import type { MonthlySummary, CategoryExpense, MonthlyTrendItem, OwnershipBreakdown, BudgetAlert } from '@/types';

export const dashboardService = {
  async getSummary(groupId: string, month: number, year: number): Promise<MonthlySummary> {
    const res = await api.get<MonthlySummary>(`/groups/${groupId}/dashboard/summary`, { params: { month, year } });
    return res.data;
  },

  async getByCategory(groupId: string, month: number, year: number): Promise<CategoryExpense[]> {
    const res = await api.get<CategoryExpense[]>(`/groups/${groupId}/dashboard/by-category`, { params: { month, year } });
    return res.data;
  },

  async getMonthlyTrend(groupId: string): Promise<MonthlyTrendItem[]> {
    const res = await api.get<MonthlyTrendItem[]>(`/groups/${groupId}/dashboard/monthly-trend`);
    return res.data;
  },

  async getByOwnership(groupId: string, month: number, year: number): Promise<OwnershipBreakdown[]> {
    const res = await api.get<OwnershipBreakdown[]>(`/groups/${groupId}/dashboard/by-ownership`, { params: { month, year } });
    return res.data;
  },

  async getBudgetAlerts(groupId: string, month: number, year: number): Promise<BudgetAlert[]> {
    const res = await api.get<BudgetAlert[]>(`/groups/${groupId}/dashboard/budget-alerts`, { params: { month, year } });
    return res.data;
  },
};
