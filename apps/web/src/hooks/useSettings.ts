import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesService } from '@/services/categories.service';
import { paymentMethodsService } from '@/services/payment-methods.service';
import { useGroupStore } from '@/store/group.store';

export function useCategories() {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['categories', activeGroup?.id],
    queryFn: () => categoriesService.findAll(activeGroup!.id),
    enabled: !!activeGroup,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => categoriesService.create(activeGroup!.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      categoriesService.update(activeGroup!.id, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (id: string) => categoriesService.remove(activeGroup!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function usePaymentMethods() {
  const { activeGroup } = useGroupStore();
  return useQuery({
    queryKey: ['payment-methods', activeGroup?.id],
    queryFn: () => paymentMethodsService.findAll(activeGroup!.id),
    enabled: !!activeGroup,
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (name: string) => paymentMethodsService.create(activeGroup!.id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      paymentMethodsService.update(activeGroup!.id, id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}

export function useDeletePaymentMethod() {
  const qc = useQueryClient();
  const { activeGroup } = useGroupStore();
  return useMutation({
    mutationFn: (id: string) => paymentMethodsService.remove(activeGroup!.id, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });
}
