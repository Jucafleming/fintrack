import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionType, Ownership } from '@fintrack/shared';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budget.entity';
import { GroupsService } from '../groups/groups.service';

export interface MonthlySummary {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}

export interface CategoryBreakdown {
  categoryId: string | null;
  categoryName: string;
  color: string;
  total: number;
  percentage: number;
}

export interface OwnershipBreakdown {
  mine: { total: number; transactions: number };
  hers: { total: number; transactions: number };
  shared: { total: number; transactions: number };
}

export interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  color: string;
  limitAmount: number;
  spent: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    @InjectRepository(Budget)
    private budgetsRepo: Repository<Budget>,
    private groupsService: GroupsService,
  ) {}

  async getMonthlySummary(groupId: string, userId: string, month: number, year: number): Promise<MonthlySummary> {
    await this.groupsService.validateMembership(groupId, userId);

    const rows = await this.transactionsRepo
      .createQueryBuilder('t')
      .select('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.groupId = :groupId', { groupId })
      .andWhere('t.isPaid = true')
      .andWhere('EXTRACT(MONTH FROM t.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM t.date) = :year', { year })
      .groupBy('t.type')
      .getRawMany();

    let totalIncome = 0;
    let totalExpenses = 0;

    for (const row of rows) {
      const val = Number(row.total);
      if (row.type === TransactionType.INCOME) {
        totalIncome += val;
      } else {
        totalExpenses += val;
      }
    }

    return { month, year, totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }

  async getByCategory(groupId: string, userId: string, month: number, year: number): Promise<CategoryBreakdown[]> {
    await this.groupsService.validateMembership(groupId, userId);

    const rows = await this.transactionsRepo
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('c.name', 'categoryName')
      .addSelect('c.color', 'color')
      .addSelect('SUM(t.amount)', 'total')
      .leftJoin('t.category', 'c')
      .where('t.groupId = :groupId', { groupId })
      .andWhere('t.isPaid = true')
      .andWhere('t.type != :income', { income: TransactionType.INCOME })
      .andWhere('EXTRACT(MONTH FROM t.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM t.date) = :year', { year })
      .groupBy('t.categoryId')
      .addGroupBy('c.name')
      .addGroupBy('c.color')
      .getRawMany();

    const grandTotal = rows.reduce((sum, r) => sum + Number(r.total), 0);

    return rows.map((r) => ({
      categoryId: r.categoryId ?? null,
      categoryName: r.categoryName ?? 'Sem categoria',
      color: r.color ?? '#94a3b8',
      total: Number(r.total),
      percentage: grandTotal > 0 ? Number(((Number(r.total) / grandTotal) * 100).toFixed(2)) : 0,
    }));
  }

  async getMonthlyTrend(groupId: string, userId: string): Promise<MonthlySummary[]> {
    await this.groupsService.validateMembership(groupId, userId);

    const rows = await this.transactionsRepo
      .createQueryBuilder('t')
      .select('EXTRACT(YEAR FROM t.date)::int', 'year')
      .addSelect('EXTRACT(MONTH FROM t.date)::int', 'month')
      .addSelect('t.type', 'type')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.groupId = :groupId', { groupId })
      .andWhere('t.isPaid = true')
      .andWhere("t.date >= NOW() - INTERVAL '12 months'")
      .groupBy('year')
      .addGroupBy('month')
      .addGroupBy('t.type')
      .orderBy('year', 'ASC')
      .addOrderBy('month', 'ASC')
      .getRawMany();

    const map = new Map<string, MonthlySummary>();

    for (const row of rows) {
      const key = `${row.year}-${row.month}`;
      if (!map.has(key)) {
        map.set(key, { year: row.year, month: row.month, totalIncome: 0, totalExpenses: 0, balance: 0 });
      }
      const entry = map.get(key)!;
      const val = Number(row.total);
      if (row.type === TransactionType.INCOME) {
        entry.totalIncome += val;
      } else {
        entry.totalExpenses += val;
      }
      entry.balance = entry.totalIncome - entry.totalExpenses;
    }

    return Array.from(map.values());
  }

  async getByOwnership(groupId: string, userId: string, month: number, year: number): Promise<OwnershipBreakdown> {
    await this.groupsService.validateMembership(groupId, userId);

    const rows = await this.transactionsRepo
      .createQueryBuilder('t')
      .select('t.ownership', 'ownership')
      .addSelect('SUM(t.amount)', 'total')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.groupId = :groupId', { groupId })
      .andWhere('t.isPaid = true')
      .andWhere('t.type != :income', { income: TransactionType.INCOME })
      .andWhere('EXTRACT(MONTH FROM t.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM t.date) = :year', { year })
      .groupBy('t.ownership')
      .getRawMany();

    const result: OwnershipBreakdown = {
      mine: { total: 0, transactions: 0 },
      hers: { total: 0, transactions: 0 },
      shared: { total: 0, transactions: 0 },
    };

    for (const row of rows) {
      if (row.ownership === Ownership.MINE) {
        result.mine = { total: Number(row.total), transactions: Number(row.count) };
      } else if (row.ownership === Ownership.HERS) {
        result.hers = { total: Number(row.total), transactions: Number(row.count) };
      } else if (row.ownership === Ownership.SHARED) {
        result.shared = { total: Number(row.total), transactions: Number(row.count) };
      }
    }

    return result;
  }

  async getBudgetAlerts(groupId: string, userId: string, month: number, year: number): Promise<BudgetAlert[]> {
    await this.groupsService.validateMembership(groupId, userId);

    const budgets = await this.budgetsRepo.find({
      where: { groupId, month, year },
      relations: ['category'],
    });

    if (budgets.length === 0) return [];

    const spentRows = await this.transactionsRepo
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.groupId = :groupId', { groupId })
      .andWhere('t.isPaid = true')
      .andWhere('t.type != :income', { income: TransactionType.INCOME })
      .andWhere('EXTRACT(MONTH FROM t.date) = :month', { month })
      .andWhere('EXTRACT(YEAR FROM t.date) = :year', { year })
      .andWhere('t.categoryId IN (:...categoryIds)', {
        categoryIds: budgets.map((b) => b.categoryId),
      })
      .groupBy('t.categoryId')
      .getRawMany();

    const spentMap = new Map<string, number>();
    for (const row of spentRows) {
      spentMap.set(row.categoryId, Number(row.total));
    }

    return budgets.map((budget) => {
      const spent = spentMap.get(budget.categoryId) ?? 0;
      const limit = Number(budget.limitAmount);
      const percentage = limit > 0 ? Number(((spent / limit) * 100).toFixed(2)) : 0;
      const status: BudgetAlert['status'] = percentage >= 100 ? 'exceeded' : percentage >= 80 ? 'warning' : 'ok';

      return {
        budgetId: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category?.name ?? '',
        color: budget.category?.color ?? '#94a3b8',
        limitAmount: limit,
        spent,
        percentage,
        status,
      };
    });
  }
}
