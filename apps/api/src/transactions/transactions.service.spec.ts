import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from './transaction.entity';
import { Installment } from './installment.entity';
import { Category } from '../categories/category.entity';
import { PaymentMethod } from '../payment-methods/payment-method.entity';
import { GroupsService } from '../groups/groups.service';
import { TransactionType, Ownership, GroupRole } from '@fintrack/shared';

const mockGroupMember = { role: GroupRole.MEMBER };

const mockTransaction = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 'tx-uuid',
    groupId: 'group-uuid',
    userId: 'user-uuid',
    title: 'Aluguel',
    amount: 1500,
    date: new Date('2026-03-01'),
    type: TransactionType.FIXED,
    ownership: Ownership.SHARED,
    categoryId: null,
    paymentMethodId: null,
    isPaid: false,
    installmentCount: null,
    notes: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    group: null as any,
    user: null as any,
    category: null,
    paymentMethod: null,
    installments: [],
    ...overrides,
  } as Transaction);

const mockTransactionsRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  softRemove: jest.fn(),
};

const mockInstallmentsRepo = {};

const mockCategoriesRepo = {
  findOne: jest.fn(),
};

const mockPaymentMethodsRepo = {
  findOne: jest.fn(),
};

const mockGroupsService = {
  validateMembership: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionsRepo },
        { provide: getRepositoryToken(Installment), useValue: mockInstallmentsRepo },
        { provide: getRepositoryToken(Category), useValue: mockCategoriesRepo },
        { provide: getRepositoryToken(PaymentMethod), useValue: mockPaymentMethodsRepo },
        { provide: GroupsService, useValue: mockGroupsService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should throw ForbiddenException if user is not a group member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());

      await expect(service.findAll('group-uuid', 'user-uuid', {})).rejects.toThrow(ForbiddenException);
    });

    it('should return transactions with no filters', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTransaction()]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('group-uuid', 'user-uuid', {});

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should apply type filter', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', { type: TransactionType.INCOME });

      expect(qb.andWhere).toHaveBeenCalledWith('t.type = :type', { type: TransactionType.INCOME });
    });

    it('should apply month and year filter', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', { month: 3, year: 2026 });

      expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(MONTH FROM t.date) = :month', { month: 3 });
      expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(YEAR FROM t.date) = :year', { year: 2026 });
    });

    it('should apply categoryId filter', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', { categoryId: 'cat-uuid' });

      expect(qb.andWhere).toHaveBeenCalledWith('t.categoryId = :categoryId', { categoryId: 'cat-uuid' });
    });

    it('should apply paymentMethodId filter', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', { paymentMethodId: 'pm-uuid' });

      expect(qb.andWhere).toHaveBeenCalledWith('t.paymentMethodId = :paymentMethodId', { paymentMethodId: 'pm-uuid' });
    });

    it('should apply startDate and endDate filters', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', { startDate: '2026-01-01', endDate: '2026-03-31' });

      expect(qb.andWhere).toHaveBeenCalledWith('t.date >= :startDate', { startDate: '2026-01-01' });
      expect(qb.andWhere).toHaveBeenCalledWith('t.date <= :endDate', { endDate: '2026-03-31' });
    });

    it('should apply month-only filter', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', { month: 3 });

      expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(MONTH FROM t.date) = :month', { month: 3 });
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('YEAR'), expect.anything(),
      );
    });

    it('should apply year-only filter', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', { year: 2026 });

      expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(YEAR FROM t.date) = :year', { year: 2026 });
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('MONTH'), expect.anything(),
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw ForbiddenException if user is not a group member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());

      await expect(
        service.create('group-uuid', 'user-uuid', {
          title: 'Test', amount: 100, date: '2026-03-01', type: TransactionType.FIXED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for INSTALLMENT without installmentCount', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);

      await expect(
        service.create('group-uuid', 'user-uuid', {
          title: 'TV', amount: 2000, date: '2026-03-01', type: TransactionType.INSTALLMENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for INSTALLMENT with installmentCount < 2', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);

      await expect(
        service.create('group-uuid', 'user-uuid', {
          title: 'TV', amount: 2000, date: '2026-03-01', type: TransactionType.INSTALLMENT, installmentCount: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnprocessableEntityException if categoryId does not belong to group', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockCategoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('group-uuid', 'user-uuid', {
          title: 'Test', amount: 100, date: '2026-03-01', type: TransactionType.VARIABLE,
          categoryId: 'other-cat-uuid',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw UnprocessableEntityException if paymentMethodId does not belong to group', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockCategoriesRepo.findOne.mockResolvedValue({ id: 'cat-uuid' });
      mockPaymentMethodsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('group-uuid', 'user-uuid', {
          title: 'Test', amount: 100, date: '2026-03-01', type: TransactionType.VARIABLE,
          categoryId: 'cat-uuid', paymentMethodId: 'other-pm-uuid',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should create a VARIABLE transaction successfully', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockDataSource.transaction.mockImplementation(async (cb: (m: any) => any) => {
        const manager = {
          create: jest.fn((_: any, data: any) => ({ ...data, id: 'tx-new' })),
          save: jest.fn((e: any) => Promise.resolve(e)),
        };
        return cb(manager);
      });

      const result = await service.create('group-uuid', 'user-uuid', {
        title: 'Mercado', amount: 200, date: '2026-03-05', type: TransactionType.VARIABLE,
      });

      expect(result).toBeDefined();
    });

    it('should create an INCOME transaction successfully', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockDataSource.transaction.mockImplementation(async (cb: (m: any) => any) => {
        const manager = {
          create: jest.fn((_: any, data: any) => ({ ...data, id: 'tx-new' })),
          save: jest.fn((e: any) => Promise.resolve(e)),
        };
        return cb(manager);
      });

      const result = await service.create('group-uuid', 'user-uuid', {
        title: 'Salário', amount: 5000, date: '2026-03-05', type: TransactionType.INCOME,
      });

      expect(result).toBeDefined();
    });

    it('should create a FIXED transaction successfully', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockDataSource.transaction.mockImplementation(async (cb: (m: any) => any) => {
        const manager = {
          create: jest.fn((_: any, data: any) => ({ ...data, id: 'tx-new' })),
          save: jest.fn((e: any) => Promise.resolve(Array.isArray(e) ? e : e)),
        };
        return cb(manager);
      });

      const result = await service.create('group-uuid', 'user-uuid', {
        title: 'Aluguel', amount: 1500, date: '2026-03-01', type: TransactionType.FIXED,
      });

      expect(result).toBeDefined();
    });

    it('should create INSTALLMENT transaction and generate installments', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const savedInstallments: any[] = [];
      mockDataSource.transaction.mockImplementation(async (cb: (m: any) => any) => {
        const manager = {
          create: jest.fn((_: any, data: any) => ({ ...data, id: 'new-id' })),
          save: jest.fn((e: any) => {
            if (Array.isArray(e)) savedInstallments.push(...e);
            return Promise.resolve(e);
          }),
        };
        return cb(manager);
      });

      await service.create('group-uuid', 'user-uuid', {
        title: 'Notebook', amount: 3600, date: '2026-03-01',
        type: TransactionType.INSTALLMENT, installmentCount: 12,
      });

      expect(savedInstallments).toHaveLength(12);
      expect(savedInstallments[0].amount).toBe(300);
      expect(savedInstallments[0].number).toBe(1);
      expect(savedInstallments[11].number).toBe(12);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should throw NotFoundException if transaction not found', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('group-uuid', 'tx-uuid', 'user-uuid', { title: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the transaction owner', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.findOne.mockResolvedValue(mockTransaction({ userId: 'other-user' }));

      await expect(
        service.update('group-uuid', 'tx-uuid', 'user-uuid', { title: 'Novo' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update and return transaction', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const existing = mockTransaction();
      mockTransactionsRepo.findOne.mockResolvedValue(existing);
      mockTransactionsRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.update('group-uuid', 'tx-uuid', 'user-uuid', { title: 'Aluguel Março', isPaid: true });

      expect(result.title).toBe('Aluguel Março');
      expect(result.isPaid).toBe(true);
    });

    it('should throw UnprocessableEntityException if categoryId does not belong to group on update', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.findOne.mockResolvedValue(mockTransaction());
      mockCategoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('group-uuid', 'tx-uuid', 'user-uuid', { categoryId: 'bad-cat-uuid' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should throw UnprocessableEntityException if paymentMethodId does not belong to group on update', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.findOne.mockResolvedValue(mockTransaction());
      mockCategoriesRepo.findOne.mockResolvedValue({ id: 'cat-uuid' });
      mockPaymentMethodsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('group-uuid', 'tx-uuid', 'user-uuid', {
          categoryId: 'cat-uuid', paymentMethodId: 'bad-pm-uuid',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should convert date string to Date object on update', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const existing = mockTransaction();
      mockTransactionsRepo.findOne.mockResolvedValue(existing);
      mockTransactionsRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.update('group-uuid', 'tx-uuid', 'user-uuid', { date: '2026-06-15' });

      expect(result.date).toBeInstanceOf(Date);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should throw NotFoundException if transaction not found', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('group-uuid', 'tx-uuid', 'user-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      mockTransactionsRepo.findOne.mockResolvedValue(mockTransaction({ userId: 'other-user' }));

      await expect(service.remove('group-uuid', 'tx-uuid', 'user-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete the transaction', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
      const tx = mockTransaction();
      mockTransactionsRepo.findOne.mockResolvedValue(tx);
      mockTransactionsRepo.softRemove.mockResolvedValue(tx);

      await service.remove('group-uuid', 'tx-uuid', 'user-uuid');

      expect(mockTransactionsRepo.softRemove).toHaveBeenCalledWith(tx);
    });
  });
});
