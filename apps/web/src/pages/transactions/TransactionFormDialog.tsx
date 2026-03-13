import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCategories, usePaymentMethods } from '@/hooks/useSettings';
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { useToast } from '@/components/ui/toaster';
import type { Transaction } from '@/types';

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  type: z.enum(['FIXED', 'VARIABLE', 'INSTALLMENT', 'INCOME']),
  date: z.string().min(1, 'Data obrigatória'),
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  ownership: z.enum(['MINE', 'HERS', 'SHARED']).default('SHARED'),
  isPaid: z.boolean().default(false),
  notes: z.string().optional(),
  installmentCount: z.coerce.number().int().min(2).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction;
}

const TYPE_LABELS: Record<string, string> = {
  FIXED: 'Gasto Fixo',
  VARIABLE: 'Gasto Variável',
  INSTALLMENT: 'Parcelado',
  INCOME: 'Receita',
};

const OWNERSHIP_LABELS: Record<string, string> = {
  MINE: 'Meu',
  HERS: 'Dela',
  SHARED: 'Compartilhado',
};

export function TransactionFormDialog({ open, onClose, transaction }: Props) {
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'VARIABLE',
      ownership: 'SHARED',
      isPaid: false,
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (transaction) {
      reset({
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date.substring(0, 10),
        categoryId: transaction.categoryId ?? undefined,
        paymentMethodId: transaction.paymentMethodId ?? undefined,
        ownership: transaction.ownership,
        isPaid: transaction.isPaid,
        notes: transaction.notes ?? undefined,
        installmentCount: transaction.installmentCount ?? undefined,
      });
    } else {
      reset({ type: 'VARIABLE', ownership: 'SHARED', isPaid: false });
    }
  }, [transaction, reset, open]);

  async function onSubmit(data: FormData) {
    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, data });
        toast({ title: 'Transação atualizada!' });
      } else {
        await createMutation.mutateAsync(data);
        toast({ title: 'Transação criada!' });
      }
      onClose();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar a transação.', variant: 'destructive' });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar transação' : 'Nova transação'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input placeholder="Ex: Supermercado" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" placeholder="0,00" {...register('amount')} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={selectedType} onValueChange={(v) => setValue('type', v as FormData['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedType === 'INSTALLMENT' && (
              <div className="space-y-2">
                <Label>Parcelas</Label>
                <Input type="number" min={2} placeholder="Ex: 12" {...register('installmentCount')} />
                {errors.installmentCount && <p className="text-sm text-destructive">{errors.installmentCount.message}</p>}
              </div>
            )}
          </div>

          <div className={`grid gap-4 ${selectedType === 'INCOME' ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={watch('categoryId') ?? ''} onValueChange={(v) => setValue('categoryId', v || undefined)}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedType !== 'INCOME' && (
              <div className="space-y-2">
                <Label>Meio de Pagamento</Label>
                <Select value={watch('paymentMethodId') ?? ''} onValueChange={(v) => setValue('paymentMethodId', v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {(paymentMethods ?? []).map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select value={watch('ownership')} onValueChange={(v) => setValue('ownership', v as FormData['ownership'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OWNERSHIP_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{selectedType === 'INCOME' ? 'Recebido' : 'Status'}</Label>
              <Select
                value={watch('isPaid') ? 'true' : 'false'}
                onValueChange={(v) => setValue('isPaid', v === 'true')}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">{selectedType === 'INCOME' ? 'Não recebido' : 'Pendente'}</SelectItem>
                  <SelectItem value="true">{selectedType === 'INCOME' ? 'Recebido' : 'Pago'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input placeholder="Opcional" {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : transaction ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
