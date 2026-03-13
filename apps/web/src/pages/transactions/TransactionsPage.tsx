import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useTransactions, useDeleteTransaction, useUpdateTransaction } from '@/hooks/useTransactions';
import { useCategories, usePaymentMethods } from '@/hooks/useSettings';
import { TransactionFormDialog } from './TransactionFormDialog';
import { useToast } from '@/components/ui/toaster';
import { exportsService } from '@/services/exports.service';
import { useGroupStore } from '@/store/group.store';
import type { Transaction, TransactionType } from '@/types';

const TYPE_LABELS: Record<TransactionType, string> = {
  FIXED: 'Fixo',
  VARIABLE: 'Variável',
  INSTALLMENT: 'Parcelado',
  INCOME: 'Receita',
};

const TYPE_VARIANTS: Record<TransactionType, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  FIXED: 'secondary',
  VARIABLE: 'outline',
  INSTALLMENT: 'default',
  INCOME: 'outline',
};

export function TransactionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const { toast } = useToast();
  const { activeGroup } = useGroupStore();

  const filters = {
    ...(typeFilter ? { type: typeFilter as TransactionType } : {}),
    ...(monthFilter ? { month: Number(monthFilter) } : {}),
    ...(yearFilter ? { year: Number(yearFilter) } : {}),
  };

  const { data: transactions, isLoading } = useTransactions(filters);
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteTransaction();
  const updateMutation = useUpdateTransaction();

  function openCreate() {
    setEditingTransaction(undefined);
    setDialogOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditingTransaction(t);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Confirmar exclusão?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Transação excluída.' });
    } catch {
      toast({ title: 'Erro ao excluir.', variant: 'destructive' });
    }
  }

  async function handleTogglePaid(t: Transaction) {
    try {
      await updateMutation.mutateAsync({ id: t.id, data: { isPaid: !t.isPaid } });
    } catch {
      toast({ title: 'Erro ao atualizar.', variant: 'destructive' });
    }
  }

  async function handleExport() {
    try {
      await exportsService.exportCsv(activeGroup!.id, filters);
    } catch {
      toast({ title: 'Erro ao exportar.', variant: 'destructive' });
    }
  }

  const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Transações</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova transação
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={typeFilter || 'all'} onValueChange={(v) => setTypeFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Mês"
          min={1}
          max={12}
          className="w-24 h-8 text-sm"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Ano"
          className="w-28 h-8 text-sm"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        />
        {(typeFilter || monthFilter || yearFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setTypeFilter(''); setMonthFilter(''); setYearFilter(''); }}>
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {['Data', 'Título', 'Categoria', 'Valor', 'Tipo', 'Status', 'Ações'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !transactions?.length ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma transação encontrada.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate font-medium">{t.title}</p>
                    {t.notes && <p className="text-xs text-muted-foreground truncate">{t.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {t.categoryId && categoryMap[t.categoryId] && (
                        <>
                          {categoryMap[t.categoryId].color && (
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: categoryMap[t.categoryId].color ?? undefined }}
                            />
                          )}
                          <span className="text-xs">{categoryMap[t.categoryId].name}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <span className={t.type === 'INCOME' ? 'text-green-600' : 'text-foreground'}>
                      {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={TYPE_VARIANTS[t.type]}>{TYPE_LABELS[t.type]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTogglePaid(t)}
                      className={`text-xs rounded-full px-2 py-0.5 font-medium transition-colors ${
                        t.isPaid ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {t.isPaid ? 'Pago' : 'Pendente'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TransactionFormDialog open={dialogOpen} onClose={() => setDialogOpen(false)} transaction={editingTransaction} />
    </div>
  );
}
