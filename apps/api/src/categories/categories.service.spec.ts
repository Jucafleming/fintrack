import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';
import { GroupsService } from '../groups/groups.service';
import { GroupRole } from '@fintrack/shared';

const mockGroupMemberAdmin = { role: GroupRole.ADMIN };
const mockGroupMemberMember = { role: GroupRole.MEMBER };

const mockCategory = (overrides: Partial<Category> = {}): Category =>
  ({
    id: 'cat-uuid',
    groupId: 'group-uuid',
    name: 'Alimentação',
    color: '#6366f1',
    isDefault: false,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    group: null as any,
    ...overrides,
  } as Category);

const mockCategoriesRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockGroupsService = {
  validateMembership: jest.fn(),
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockCategoriesRepo },
        { provide: GroupsService, useValue: mockGroupsService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should throw ForbiddenException if user is not a group member', async () => {
      mockGroupsService.validateMembership.mockRejectedValue(new ForbiddenException());

      await expect(service.findAll('group-uuid', 'user-uuid')).rejects.toThrow(ForbiddenException);
    });

    it('should return categories excluding archived by default', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCategory()]),
      };
      mockCategoriesRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll('group-uuid', 'user-uuid', false);

      expect(qb.andWhere).toHaveBeenCalledWith('category.archivedAt IS NULL');
      expect(result).toHaveLength(1);
    });

    it('should include archived when includeArchived is true', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberMember);
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockCategory(), mockCategory({ archivedAt: new Date() })]),
      };
      mockCategoriesRepo.createQueryBuilder.mockReturnValue(qb);

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
        service.create('group-uuid', 'user-uuid', { name: 'Nova' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if category name already exists in group', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue(mockCategory());

      await expect(
        service.create('group-uuid', 'user-uuid', { name: 'Alimentação' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create and return new category', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue(null);
      const created = mockCategory({ name: 'Academia', color: '#f59e0b' });
      mockCategoriesRepo.create.mockReturnValue(created);
      mockCategoriesRepo.save.mockResolvedValue(created);

      const result = await service.create('group-uuid', 'user-uuid', { name: 'Academia', color: '#f59e0b' });

      expect(result.name).toBe('Academia');
      expect(result.isDefault).toBe(false);
    });

    it('should use default color when none provided', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue(null);
      mockCategoriesRepo.create.mockImplementation((_: any) => _);
      mockCategoriesRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.create('group-uuid', 'user-uuid', { name: 'Sem Cor' });

      expect(mockCategoriesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ color: '#6366f1' }),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should throw NotFoundException if category does not exist', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('group-uuid', 'cat-uuid', 'user-uuid', { name: 'Novo' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name already exists', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockCategoriesRepo.findOne
        .mockResolvedValueOnce(mockCategory({ name: 'Alimentação' }))
        .mockResolvedValueOnce(mockCategory({ name: 'Transporte' }));

      await expect(
        service.update('group-uuid', 'cat-uuid', 'user-uuid', { name: 'Transporte' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update and return category', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      const existing = mockCategory();
      mockCategoriesRepo.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null);
      mockCategoriesRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      const result = await service.update('group-uuid', 'cat-uuid', 'user-uuid', { name: 'Mercado' });

      expect(result.name).toBe('Mercado');
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should archive default categories instead of deleting', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      const defaultCat = mockCategory({ isDefault: true });
      mockCategoriesRepo.findOne.mockResolvedValue(defaultCat);
      mockCategoriesRepo.save.mockImplementation((e: any) => Promise.resolve(e));

      await service.remove('group-uuid', 'cat-uuid', 'user-uuid');

      expect(mockCategoriesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ archivedAt: expect.any(Date) }),
      );
      expect(mockCategoriesRepo.remove).not.toHaveBeenCalled();
    });

    it('should hard delete custom categories', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      const customCat = mockCategory({ isDefault: false });
      mockCategoriesRepo.findOne.mockResolvedValue(customCat);
      mockCategoriesRepo.remove.mockResolvedValue(customCat);

      await service.remove('group-uuid', 'cat-uuid', 'user-uuid');

      expect(mockCategoriesRepo.remove).toHaveBeenCalledWith(customCat);
      expect(mockCategoriesRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if category not found', async () => {
      mockGroupsService.validateMembership.mockResolvedValue(mockGroupMemberAdmin);
      mockCategoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove('group-uuid', 'cat-uuid', 'user-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
