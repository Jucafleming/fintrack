import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExportsService } from './exports.service';
import { Transaction } from '../transactions/transaction.entity';
import { GroupsService } from '../groups/groups.service';
import { TransactionType, Ownership, GroupRole } from '@fintrack/shared';

jest.mock('exceljs', () => {
  const addRow = jest.fn();
  const csv = { write: jest.fn().mockResolvedValue(undefined) };
  const addWorksheet = jest.fn(() => ({
    columns: [],
    addRow,
  }));
  return {
    Workbook: jest.fn(() => ({
      addWorksheet,
      csv,
    })),
  };
});

const mockGroupMember = { role: GroupRole.MEMBER };

const mockTransaction = (overrides: any = {}) => ({
  id: 'tx-uuid',
  groupId: 'group-uuid',
  userId: 'user-uuid',
  title: 'Mercado',
  amount: 200,
  date: new Date('2026-03-05'),
  type: TransactionType.VARIABLE,
  ownership: Ownership.SHARED,
  categoryId: 'cat-uuid',
  paymentMethodId: null,
  isPaid: true,
  notes: null,
  category: { name: 'Mercado' },
  paymentMethod: null,
  ...overrides,
});

const mockTransactionsRepo = {
  createQueryBuilder: jest.fn(),
};

const mockGroupsService = {
  validateMembership: jest.fn(),
};

const makeQb = (transactions: any[]) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue(transactions),
});

const mockResponse = () => {
  const res: any = {};
  res.setHeader = jest.fn();
  return res;
};

describe('ExportsService', () => {
  let service: ExportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionsRepo },
        { provide: GroupsService, useValue: mockGroupsService },
      ],
    }).compile();

    service = module.get<ExportsService>(ExportsService);
    jest.clearAllMocks();
  });

  it('should throw ForbiddenException if not a member', async () => {
    mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());

    await expect(service.exportCsv('group-uuid', 'user-uuid', {}, mockResponse())).rejects.toThrow(ForbiddenException);
  });

  it('should set correct response headers and write CSV', async () => {
    mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
    mockTransactionsRepo.createQueryBuilder.mockReturnValue(makeQb([mockTransaction()]));
    const res = mockResponse();

    await service.exportCsv('group-uuid', 'user-uuid', {}, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="transacoes.csv"');
  });

  it('should apply type filter', async () => {
    mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
    const qb = makeQb([]);
    mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

    await service.exportCsv('group-uuid', 'user-uuid', { type: TransactionType.FIXED }, mockResponse());

    expect(qb.andWhere).toHaveBeenCalledWith('t.type = :type', { type: TransactionType.FIXED });
  });

  it('should apply categoryId filter', async () => {
    mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
    const qb = makeQb([]);
    mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

    await service.exportCsv('group-uuid', 'user-uuid', { categoryId: 'cat-uuid' }, mockResponse());

    expect(qb.andWhere).toHaveBeenCalledWith('t.categoryId = :categoryId', { categoryId: 'cat-uuid' });
  });

  it('should apply month and year filters together', async () => {
    mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
    const qb = makeQb([]);
    mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

    await service.exportCsv('group-uuid', 'user-uuid', { month: 3, year: 2026 }, mockResponse());

    expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(MONTH FROM t.date) = :month', { month: 3 });
    expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(YEAR FROM t.date) = :year', { year: 2026 });
  });

  it('should apply month-only filter', async () => {
    mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
    const qb = makeQb([]);
    mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

    await service.exportCsv('group-uuid', 'user-uuid', { month: 3 }, mockResponse());

    expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(MONTH FROM t.date) = :month', { month: 3 });
  });

  it('should apply year-only filter', async () => {
    mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
    const qb = makeQb([]);
    mockTransactionsRepo.createQueryBuilder.mockReturnValue(qb);

    await service.exportCsv('group-uuid', 'user-uuid', { year: 2026 }, mockResponse());

    expect(qb.andWhere).toHaveBeenCalledWith('EXTRACT(YEAR FROM t.date) = :year', { year: 2026 });
  });

  it('should handle transaction with null category and paymentMethod', async () => {
    mockGroupsService.validateMembership.mockResolvedValue(mockGroupMember);
    mockTransactionsRepo.createQueryBuilder.mockReturnValue(
      makeQb([mockTransaction({ category: null, paymentMethod: null, notes: null })]),
    );
    const res = mockResponse();

    await service.exportCsv('group-uuid', 'user-uuid', {}, res);

    expect(res.setHeader).toHaveBeenCalled();
  });
});
