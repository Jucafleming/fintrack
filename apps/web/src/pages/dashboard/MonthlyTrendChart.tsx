import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useDashboardMonthlyTrend } from '@/hooks/useDashboard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MonthlyTrendChart() {
  const { data, isLoading } = useDashboardMonthlyTrend();

  const chartData = (data ?? []).map((item) => ({
    label: format(new Date(item.year, item.month - 1), 'MMM/yy', { locale: ptBR }),
    Receitas: item.totalIncome,
    Gastos: item.totalExpenses,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparativo dos Últimos 12 Meses</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 bg-muted animate-pulse rounded" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="Receitas" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
