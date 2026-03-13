import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatMonthYear, capitalizeFirst } from '@/lib/utils';
import { useDashboardSummary } from '@/hooks/useDashboard';
import { useGroupStore } from '@/store/group.store';

interface Props {
  month: number;
  year: number;
}

export function MonthlySummaryCards({ month, year }: Props) {
  const { data, isLoading } = useDashboardSummary(month, year);

  const cards = [
    {
      title: 'Receitas',
      value: data?.totalIncome ?? 0,
      icon: TrendingUp,
      className: 'text-green-500',
    },
    {
      title: 'Gastos',
      value: data?.totalExpenses ?? 0,
      icon: TrendingDown,
      className: 'text-red-500',
    },
    {
      title: 'Saldo',
      value: data?.balance ?? 0,
      icon: DollarSign,
      className: (data?.balance ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ title, value, icon: Icon, className }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${className}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : (
              <div className={`text-2xl font-bold ${className}`}>{formatCurrency(value)}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
