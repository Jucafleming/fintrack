import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useDashboardByCategory } from '@/hooks/useDashboard';

const DEFAULT_COLOR = '#6366f1';

interface Props {
  month: number;
  year: number;
}

export function ByCategoryChart({ month, year }: Props) {
  const { data, isLoading } = useDashboardByCategory(month, year);

  const chartData = (data ?? []).map((item) => ({
    name: item.categoryName ?? 'Sem categoria',
    value: item.total,
    color: item.categoryColor ?? DEFAULT_COLOR,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gastos por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 bg-muted animate-pulse rounded" />
        ) : chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum gasto registrado neste mês.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={90} dataKey="value" nameKey="name">
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
