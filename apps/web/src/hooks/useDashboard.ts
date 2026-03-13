import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboard.service';
import { useGroupStore } from '@/store/group.store';

export function useDashboardSummary(month: number, year: number) {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['dashboard', 'summary', activeGroup?.id, month, year],
    queryFn: () => dashboardService.getSummary(activeGroup!.id, month, year),
    enabled: !!activeGroup,
  });
}

export function useDashboardByCategory(month: number, year: number) {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['dashboard', 'by-category', activeGroup?.id, month, year],
    queryFn: () => dashboardService.getByCategory(activeGroup!.id, month, year),
    enabled: !!activeGroup,
  });
}

export function useDashboardMonthlyTrend() {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['dashboard', 'monthly-trend', activeGroup?.id],
    queryFn: () => dashboardService.getMonthlyTrend(activeGroup!.id),
    enabled: !!activeGroup,
  });
}

export function useDashboardByOwnership(month: number, year: number) {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['dashboard', 'by-ownership', activeGroup?.id, month, year],
    queryFn: () => dashboardService.getByOwnership(activeGroup!.id, month, year),
    enabled: !!activeGroup,
  });
}

export function useDashboardBudgetAlerts(month: number, year: number) {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['dashboard', 'budget-alerts', activeGroup?.id, month, year],
    queryFn: () => dashboardService.getBudgetAlerts(activeGroup!.id, month, year),
    enabled: !!activeGroup,
  });
}
