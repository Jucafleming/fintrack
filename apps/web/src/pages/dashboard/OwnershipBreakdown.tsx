import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useDashboardByOwnership } from '@/hooks/useDashboard';
import { useGroupMembers } from '@/hooks/useGroups';
import { useGroupStore } from '@/store/group.store';
import { useAuthStore } from '@/store/auth.store';
import type { Ownership } from '@/types';

interface Props {
  month: number;
  year: number;
}

export function OwnershipBreakdown({ month, year }: Props) {
  const { data, isLoading } = useDashboardByOwnership(month, year);
  const { activeGroup } = useGroupStore();
  const { user } = useAuthStore();
  const { data: members } = useGroupMembers(activeGroup?.id);

  // Build dynamic labels
  const otherMember = members?.find((m) => m.userId !== user?.id);

  function getLabel(ownership: Ownership): string {
    if (ownership === 'MINE') return user?.name ?? 'Meu';
    if (ownership === 'HERS') return otherMember?.user?.name ?? 'Outro';
    return 'Compartilhado';
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visão por Responsável</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 bg-muted animate-pulse rounded" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma transação neste mês.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.map((item) => (
              <div key={item.ownership} className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">{getLabel(item.ownership)}</p>
                <p className="text-xl font-bold">{formatCurrency(item.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.count} transações</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
