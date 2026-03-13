import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetsService } from '@/services/budgets.service';
import { useGroupStore } from '@/store/group.store';

export function useBudgets(month?: number, year?: number) {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['budgets', activeGroup?.id, month, year],
    queryFn: () => budgetsService.findAll(activeGroup!.id, { month, year }),
    enabled: !!activeGroup,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (data: { categoryId: string; month: number; year: number; limitAmount: number }) =>
      budgetsService.create(activeGroup!.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: ({ id, limitAmount }: { id: string; limitAmount: number }) =>
      budgetsService.update(activeGroup!.id, id, limitAmount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (id: string) => budgetsService.remove(activeGroup!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  });
}
