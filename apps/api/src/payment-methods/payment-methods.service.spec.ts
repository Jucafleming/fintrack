import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethod } from './payment-method.entity';
import { GroupsService } from '../groups/groups.service';
import { GroupRole } from '@fintrack/shared';

const mockGroupMemberAdmin = { role: GroupRole.ADMIN };
const mockGroupMemberMember = { role: GroupRole.MEMBER };

const mockPM = (overrides: Partial<PaymentMethod> = {}): PaymentMethod =>
  ({
    id: 'pm-uuid',
    groupId: 'group-uuid',
    name: 'Pix',
    isDefault: false,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    group: null as any,
    ...overrides,
  } as PaymentMethod);

const mockRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockGroupsService = {
  validateMembership: jest.fn(),
};

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: getRepositoryToken(PaymentMethod), useValue: mockRepo },
        { provide: GroupsService, useValue: mockGroupsService },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);
    jest.clearAllMocks();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should throw ForbiddenException if user is not a group member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());

      await expect(service.findAll('group-uuid', 'user-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should exclude archived by default', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPM()]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('group-uuid', 'user-uuid', false);

      expect(qb.andWhere).toHaveBeenCalledWith('pm.archivedAt IS NULL');
    });

    it('should include archived when requested', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPM(), mockPM({ archivedAt: new Date() })]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('group-uuid', 'user-uuid', true);

      expect(qb.andWhere).not.toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw ForbiddenException if user is not admin', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberMember);

      await expect(
        service.create('group-uuid', 'user-uuid', { name: 'Carteira' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if name already exists in group', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockRepo.findOne.mockResolvedValue(mockPM());

      await expect(
        service.create('group-uuid', 'user-uuid', { name: 'Pix' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return new payment method', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockRepo.findOne.mockResolvedValue(null);
      const created = mockPM({ name: 'Carteira' });
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.create('group-uuid', 'user-uuid', { name: 'Carteira' });

      expect(result.name).toBe('Carteira');
      expect(result.isDefault).toBe(false);
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should throw NotFoundException if payment method does not exist', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('group-uuid', 'pm-uuid', 'user-uuid', { name: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name already exists', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockRepo.findOne
        .mockResolvedValueOnce(mockPM({ name: 'Pix' }))
        .mockResolvedValueOnce(mockPM({ name: 'Nubank' }));

      await expect(
        service.update('group-uuid', 'pm-uuid', 'user-uuid', { name: 'Nubank' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update and return payment method', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      const existing = mockPM();
      mockRepo.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(null);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.update('group-uuid', 'pm-uuid', 'user-uuid', { name: 'Transferência' });

      expect(result.name).toBe('Transferência');
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should archive default payment methods instead of deleting', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      const defaultPM = mockPM({ isDefault: true });
      mockRepo.findOne.mockResolvedValue(defaultPM);
      mockRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.remove('group-uuid', 'pm-uuid', 'user-uuid');

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ archivedAt: expect.any(Date) }),
      );
      expect(mockRepo.remove).not.toHaveBeenCalled();
    });

    it('should hard delete custom payment methods', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      const customPM = mockPM({ isDefault: false });
      mockRepo.findOne.mockResolvedValue(customPM);
      mockRepo.remove.mockResolvedValue(customPM);

      await service.remove('group-uuid', 'pm-uuid', 'user-uuid');

      expect(mockRepo.remove).toHaveBeenCalledWith(customPM);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment method not found', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('group-uuid', 'pm-uuid', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
