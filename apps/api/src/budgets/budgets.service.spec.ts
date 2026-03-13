import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BudgetsService } from './budgets.service';
import { Budget } from './budget.entity';
import { Category } from '../categories/category.entity';
import { GroupsService } from '../groups/groups.service';
import { GroupRole } from '@fintrack/shared';

const mockAdmin = { role: GroupRole.ADMIN };
const mockMember = { role: GroupRole.MEMBER };

const mockBudget = (overrides: Partial<Budget> = {}): Budget =>
  ({
    id: 'budget-uuid',
    groupId: 'group-uuid',
    categoryId: 'cat-uuid',
    month: 3,
    year: 2026,
    limitAmount: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 'cat-uuid', name: 'Mercado', color: '#6366f1' } as any,
    group: null as any,
    ...overrides,
  } as Budget);

const mockBudgetsRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockCategoriesRepo = {
  findOne: jest.fn(),
};

const mockGroupsService = {
  validateMembership: jest.fn(),
};

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: getRepositoryToken(Budget), useValue: mockBudgetsRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoriesRepo },
        { provide: GroupsService, useValue: mockGroupsService },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
    jest.clearAllMocks();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());

      await expect(service.findAll('group-uuid', 'user-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should return all budgets for the group', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockMember);
      mockBudgetsRepo.find.mockResolvedValue([mockBudget()]);

      const result = await service.findAll('group-uuid', 'user-uuid');

      expect(mockBudgetsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: 'group-uuid' } }),
      );
      expect(result).toHaveLength(1);
    });

    it('should filter by month and year when provided', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockMember);
      mockBudgetsRepo.find.mockResolvedValue([]);

      await service.findAll('group-uuid', 'user-uuid', 3, 2026);

      expect(mockBudgetsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { groupId: 'group-uuid', month: 3, year: 2026 } }),
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());

      await expect(
        service.create('group-uuid', 'user-uuid', { categoryId: 'cat-uuid', month: 3, year: 2026, limitAmount: 500 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockMember);

      await expect(
        service.create('group-uuid', 'user-uuid', { categoryId: 'cat-uuid', month: 3, year: 2026, limitAmount: 500 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw UnprocessableEntityException if category does not belong to group', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('group-uuid', 'user-uuid', { categoryId: 'other-cat', month: 3, year: 2026, limitAmount: 500 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw ConflictException if budget already exists for period', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue({ id: 'cat-uuid' });
      mockBudgetsRepo.findOne.mockResolvedValue(mockBudget());

      await expect(
        service.create('group-uuid', 'user-uuid', { categoryId: 'cat-uuid', month: 3, year: 2026, limitAmount: 500 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return budget', async () => {
      const budget = mockBudget();
      mockGroupsService.validateMembership.mockResolvedValue(mockAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue({ id: 'cat-uuid' });
      mockBudgetsRepo.findOne.mockResolvedValue(null);
      mockBudgetsRepo.create.mockReturnValue(budget);
      mockBudgetsRepo.save.mockResolvedValue(budget);

      const result = await service.create('group-uuid', 'user-uuid', {
        categoryId: 'cat-uuid', month: 3, year: 2026, limitAmount: 1000,
      });

      expect(result).toEqual(budget);
      expect(mockBudgetsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'group-uuid', categoryId: 'cat-uuid' }),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should throw ForbiddenException if not admin', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockMember);

      await expect(
        service.update('group-uuid', 'budget-uuid', 'user-uuid', { limitAmount: 800 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockAdmin);
      mockBudgetsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('group-uuid', 'budget-uuid', 'user-uuid', { limitAmount: 800 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update limitAmount and return budget', async () => {
      const budget = mockBudget();
      mockGroupsService.validateMembership.mockResolvedValue(mockAdmin);
      mockBudgetsRepo.findOne.mockResolvedValue(budget);
      mockBudgetsRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.update('group-uuid', 'budget-uuid', 'user-uuid', { limitAmount: 800 });

      expect(result.limitAmount).toBe(800);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should throw ForbiddenException if not admin', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockMember);

      await expect(service.remove('group-uuid', 'budget-uuid', 'user-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if budget not found', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockAdmin);
      mockBudgetsRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('group-uuid', 'budget-uuid', 'user-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should remove the budget', async () => {
      const budget = mockBudget();
      mockGroupsService.validateMembership.mockResolvedValue(mockAdmin);
      mockBudgetsRepo.findOne.mockResolvedValue(budget);
      mockBudgetsRepo.remove.mockResolvedValue(undefined);

      await service.remove('group-uuid', 'budget-uuid', 'user-uuid');

      expect(mockBudgetsRepo.remove).toHaveBeenCalledWith(budget);
    });
  });
});
