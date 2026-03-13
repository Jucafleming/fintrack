import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsService, type TransactionFilters, type CreateTransactionDto } from '@/services/transactions.service';
import { useGroupStore } from '@/store/group.store';

export function useTransactions(filters?: TransactionFilters) {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['transactions', activeGroup?.id, filters],
    queryFn: () => transactionsService.findAll(activeGroup!.id, filters),
    enabled: !!activeGroup,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (data: CreateTransactionDto) => transactionsService.create(activeGroup!.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransactionDto> }) =>
      transactionsService.update(activeGroup!.id, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (id: string) => transactionsService.remove(activeGroup!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}
