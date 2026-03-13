import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatMonthYear, capitalizeFirst } from '@/lib/utils';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useSettings';
import { useDashboardBudgetAlerts } from '@/hooks/useDashboard';
import { useToast } from '@/components/ui/toaster';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Budget } from '@/types';

export function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | undefined>();
  const { toast } = useToast();

  const { data: budgets } = useBudgets(month, year);
  const { data: alerts } = useDashboardBudgetAlerts(month, year);
  const { data: categories } = useCategories();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const deleteMutation = useDeleteBudget();

  const alertMap = Object.fromEntries((alerts ?? []).map((a) => [a.budgetId, a]));
  const categoryMap = Object.fromEntries((categories ?? []).map((c) => [c.id, c]));

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function openCreate() { setEditing(undefined); setDialogOpen(true); }
  function openEdit(b: Budget) { setEditing(b); setDialogOpen(true); }

  async function handleDelete(id: string) {
    if (!confirm('Confirmar exclusão?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Orçamento excluído.' });
    } catch {
      toast({ title: 'Erro ao excluir.', variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo orçamento
        </Button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-base font-semibold min-w-[160px] text-center capitalize">
          {capitalizeFirst(formatMonthYear(month, year))}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {/* Budget cards */}
      {!budgets?.length ? (
        <div className="text-center text-muted-foreground py-12">
          Nenhum orçamento definido para este mês.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const alert = alertMap[b.id];
            const pct = alert?.percentage ?? 0;
            return (
              <Card key={b.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {categoryMap[b.categoryId]?.color && (
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryMap[b.categoryId].color ?? undefined }} />
                      )}
                      <span className="font-medium text-sm">{categoryMap[b.categoryId]?.name ?? 'Categoria'}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{alert ? formatCurrency(alert.spent) : 'R$ 0,00'} gasto</span>
                      <span>Limite: {formatCurrency(b.limitAmount)}</span>
                    </div>
                    <Progress
                      value={Math.min(pct, 100)}
                      className={
                        pct >= 100 ? '[&>div]:bg-destructive' : pct >= 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                      }
                    />
                    <p className="text-xs text-right text-muted-foreground mt-1">{pct.toFixed(0)}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <BudgetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        budget={editing}
        month={month}
        year={year}
        categories={categories ?? []}
      />
    </div>
  );
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  budget?: Budget;
  month: number;
  year: number;
  categories: { id: string; name: string }[];
}

function BudgetDialog({ open, onClose, budget, month, year, categories }: DialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? '');
  const [limitAmount, setLimitAmount] = useState(budget?.limitAmount?.toString() ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryId || !limitAmount) return;
    try {
      if (budget) {
        await updateMutation.mutateAsync({ id: budget.id, limitAmount: Number(limitAmount) });
      } else {
        await createMutation.mutateAsync({ categoryId, month, year, limitAmount: Number(limitAmount) });
      }
      toast({ title: budget ? 'Orçamento atualizado!' : 'Orçamento criado!' });
      onClose();
    } catch {
      toast({ title: 'Erro ao salvar orçamento.', variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? 'Editar orçamento' : 'Novo orçamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!!budget}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor limite (R$)</Label>
            <Input type="number" step="0.01" placeholder="0,00" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {budget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
