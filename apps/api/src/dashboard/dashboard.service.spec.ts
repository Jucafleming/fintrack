import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budget.entity';
import { GroupsService } from '../groups/groups.service';
import { TransactionType, Ownership, GroupRole } from '@fintrack/shared';

const mockGroupMember = { role: GroupRole.MEMBER };

const mockTransactionsRepo = {
  createQueryBuilder: jest.fn(),
};

const mockBudgetsRepo = {
  find: jest.fn(),
};

const mockGroupsService = {
  validateMembership: jest.fn(),
};

const makeQb = (rawResult: any[]) => ({
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  leftJoin: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn().mockResolvedValue(rawResult),
});

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionsRepo },
        { provide: getRepositoryToken(Budget), useValue: mockBudgetsRepo },
        { provide: GroupsService, useValue: mockGroupsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  // ─── getMonthlySummary ────────────────────────────────────────────────────────

  describe('getMonthlySummary', () => {
    it('should throw ForbiddenException if not a member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());
      await expect(service.getMonthlySummary('g', 'u', 3, 2026)).rejects.toThrow(ForbiddenException);
    });

    it('should return correct totals for income and expenses', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { type: TransactionType.INCOME, total: '5000' },
        { type: TransactionType.FIXED, total: '2000' },
        { type: TransactionType.VARIABLE, total: '500' },
      ]));

      const result = await service.getMonthlySummary('group-uuid', 'user-uuid', 3, 2026);

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(2500);
      expect(result.balance).toBe(2500);
      expect(result.month).toBe(3);
      expect(result.year).toBe(2026);
    });

    it('should return zeros when no transactions exist', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await service.getMonthlySummary('group-uuid', 'user-uuid', 3, 2026);

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.balance).toBe(0);
    });
  });

  // ─── getByCategory ────────────────────────────────────────────────────────────

  describe('getByCategory', () => {
    it('should throw ForbiddenException if not a member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());
      await expect(service.getByCategory('g', 'u', 3, 2026)).rejects.toThrow(ForbiddenException);
    });

    it('should return category breakdown with correct percentages', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { categoryId: 'cat-1', categoryName: 'Mercado', color: '#111', total: '800' },
        { categoryId: 'cat-2', categoryName: 'Uber', color: '#222', total: '200' },
      ]));

      const result = await service.getByCategory('group-uuid', 'user-uuid', 3, 2026);

      expect(result).toHaveLength(2);
      expect(result[0].percentage).toBe(80);
      expect(result[1].percentage).toBe(20);
    });

    it('should label null category as "Sem categoria"', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { categoryId: null, categoryName: null, color: null, total: '100' },
      ]));

      const result = await service.getByCategory('group-uuid', 'user-uuid', 3, 2026);

      expect(result[0].categoryName).toBe('Sem categoria');
      expect(result[0].categoryId).toBeNull();
    });

    it('should return zero percentages when grandTotal is 0', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await service.getByCategory('group-uuid', 'user-uuid', 3, 2026);

      expect(result).toHaveLength(0);
    });
  });

  // ─── getMonthlyTrend ──────────────────────────────────────────────────────────

  describe('getMonthlyTrend', () => {
    it('should throw ForbiddenException if not a member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());
      await expect(service.getMonthlyTrend('g', 'u')).rejects.toThrow(ForbiddenException);
    });

    it('should aggregate by month/year correctly', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { year: 2026, month: 2, type: TransactionType.INCOME, total: '4000' },
        { year: 2026, month: 2, type: TransactionType.FIXED, total: '1500' },
        { year: 2026, month: 3, type: TransactionType.INCOME, total: '5000' },
      ]));

      const result = await service.getMonthlyTrend('group-uuid', 'user-uuid');

      expect(result).toHaveLength(2);
      const feb = result.find(r => r.month === 2)!;
      expect(feb.totalIncome).toBe(4000);
      expect(feb.totalExpenses).toBe(1500);
      expect(feb.balance).toBe(2500);
    });
  });

  // ─── getByOwnership ───────────────────────────────────────────────────────────

  describe('getByOwnership', () => {
    it('should throw ForbiddenException if not a member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());
      await expect(service.getByOwnership('g', 'u', 3, 2026)).rejects.toThrow(ForbiddenException);
    });

    it('should return correct totals per ownership', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { ownership: Ownership.MINE, total: '1200', count: '8' },
        { ownership: Ownership.HERS, total: '900', count: '5' },
        { ownership: Ownership.SHARED, total: '1100', count: '6' },
      ]));

      const result = await service.getByOwnership('group-uuid', 'user-uuid', 3, 2026);

      expect(result.mine).toEqual({ total: 1200, transactions: 8 });
      expect(result.hers).toEqual({ total: 900, transactions: 5 });
      expect(result.shared).toEqual({ total: 1100, transactions: 6 });
    });

    it('should return zeros when no transactions exist', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await service.getByOwnership('group-uuid', 'user-uuid', 3, 2026);

      expect(result.mine.total).toBe(0);
      expect(result.hers.total).toBe(0);
      expect(result.shared.total).toBe(0);
    });
  });

  // ─── getBudgetAlerts ──────────────────────────────────────────────────────────

  describe('getBudgetAlerts', () => {
    it('should throw ForbiddenException if not a member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());
      await expect(service.getBudgetAlerts('g', 'u', 3, 2026)).rejects.toThrow(ForbiddenException);
    });

    it('should return empty array when no budgets exist', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockBudgetsRepo.find.mockResolvedValue([]);

      const result = await service.getBudgetAlerts('group-uuid', 'user-uuid', 3, 2026);

      expect(result).toHaveLength(0);
    });

    it('should return "ok" status when spent < 80%', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockBudgetsRepo.find.mockResolvedValue([
        { id: 'b-1', categoryId: 'cat-1', month: 3, year: 2026, limitAmount: '1000',
          category: { name: 'Mercado', color: '#111' } },
      ]);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { categoryId: 'cat-1', total: '700' },
      ]));

      const result = await service.getBudgetAlerts('group-uuid', 'user-uuid', 3, 2026);

      expect(result[0].status).toBe('ok');
      expect(result[0].spent).toBe(700);
      expect(result[0].percentage).toBe(70);
    });

    it('should return "warning" status when spent >= 80% and < 100%', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockBudgetsRepo.find.mockResolvedValue([
        { id: 'b-1', categoryId: 'cat-1', month: 3, year: 2026, limitAmount: '1000',
          category: { name: 'Mercado', color: '#111' } },
      ]);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { categoryId: 'cat-1', total: '850' },
      ]));

      const result = await service.getBudgetAlerts('group-uuid', 'user-uuid', 3, 2026);

      expect(result[0].status).toBe('warning');
    });

    it('should return "exceeded" status when spent >= 100%', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockBudgetsRepo.find.mockResolvedValue([
        { id: 'b-1', categoryId: 'cat-1', month: 3, year: 2026, limitAmount: '1000',
          category: { name: 'Mercado', color: '#111' } },
      ]);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([
        { categoryId: 'cat-1', total: '1200' },
      ]));

      const result = await service.getBudgetAlerts('group-uuid', 'user-uuid', 3, 2026);

      expect(result[0].status).toBe('exceeded');
    });

    it('should show 0 spent when category has no transactions', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockBudgetsRepo.find.mockResolvedValue([
        { id: 'b-1', categoryId: 'cat-1', month: 3, year: 2026, limitAmount: '500',
          category: { name: 'Lazer', color: '#222' } },
      ]);
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await service.getBudgetAlerts('group-uuid', 'user-uuid', 3, 2026);

      expect(result[0].spent).toBe(0);
      expect(result[0].status).toBe('ok');
    });
  });
});
