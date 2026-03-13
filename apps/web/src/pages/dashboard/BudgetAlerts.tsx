import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { useDashboardBudgetAlerts } from '@/hooks/useDashboard';

interface Props {
  month: number;
  year: number;
}

export function BudgetAlerts({ month, year }: Props) {
  const { data, isLoading } = useDashboardBudgetAlerts(month, year);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertas de Orçamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum orçamento definido para este mês.</p>
        ) : (
          data.map((alert) => (
            <div key={alert.budgetId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{alert.categoryName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {formatCurrency(alert.spent)} / {formatCurrency(alert.limitAmount)}
                  </span>
                  <Badge
                    variant={alert.status === 'exceeded' ? 'destructive' : alert.status === 'warning' ? 'warning' : 'success'}
                  >
                    {alert.status === 'exceeded' ? 'Ultrapassado' : alert.status === 'warning' ? 'Atenção' : 'OK'}
                  </Badge>
                </div>
              </div>
              <Progress
                value={Math.min(alert.percentage, 100)}
                className={
                  alert.status === 'exceeded'
                    ? '[&>div]:bg-destructive'
                    : alert.status === 'warning'
                    ? '[&>div]:bg-yellow-500'
                    : '[&>div]:bg-green-500'
                }
              />
              <p className="text-xs text-muted-foreground text-right">{alert.percentage.toFixed(0)}%</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
