import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { capitalizeFirst, formatMonthYear } from '@/lib/utils';
import { MonthlySummaryCards } from './MonthlySummaryCards';
import { ByCategoryChart } from './ByCategoryChart';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { BudgetAlerts } from './BudgetAlerts';
import { OwnershipBreakdown } from './OwnershipBreakdown';
import { useGroupStore } from '@/store/group.store';

export function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { activeGroup } = useGroupStore();

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  if (!activeGroup) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Selecione um grupo para ver o dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold min-w-[160px] text-center capitalize">
          {capitalizeFirst(formatMonthYear(month, year))}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary cards */}
      <MonthlySummaryCards month={month} year={year} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ByCategoryChart month={month} year={year} />
        <BudgetAlerts month={month} year={year} />
      </div>

      {/* Monthly trend */}
      <MonthlyTrendChart />

      {/* Ownership */}
      <OwnershipBreakdown month={month} year={year} />
    </div>
  );
}
