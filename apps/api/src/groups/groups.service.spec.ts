import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GroupsService } from './groups.service';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { User } from '../users/user.entity';
import { SeedService } from '../seed/seed.service';
import { GroupRole } from '@fintrack/shared';

const mockGroup = (): Group =>
  ({ id: 'group-uuid', name: 'Test Group', members: [] } as any);

const mockMember = (role = GroupRole.MEMBER): GroupMember =>
  ({ id: 'member-uuid', groupId: 'group-uuid', userId: 'user-uuid', role } as any);

const mockUser = (): User =>
  ({ id: 'target-uuid', email: 'target@example.com' } as any);

const mockGroupsRepo = {
  createQueryBuilder: jest.fn(),
};

const mockMembersRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

const mockUsersRepo = {
  findOne: jest.fn(),
};

const mockSeedService = {
  seedGroup: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn(),
};

describe('GroupsService', () => {
  let service: GroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(Group), useValue: mockGroupsRepo },
        { provide: getRepositoryToken(GroupMember), useValue: mockMembersRepo },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: SeedService, useValue: mockSeedService },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    jest.clearAllMocks();
  });

  // ─── findAllByUser ────────────────────────────────────────────────────────────

  describe('findAllByUser', () => {
    it('should return groups for a user via query builder', async () => {
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockGroup()]),
      };
      mockGroupsRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAllByUser('user-uuid');

      expect(mockGroupsRepo.createQueryBuilder).toHaveBeenCalledWith('group');
      expect(result).toHaveLength(1);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a group, add creator as admin, and seed defaults', async () => {
      mockDataSource.transaction.mockImplementation(async (cb: (m: any) => any) => {
        const manager = {
          create: jest.fn((entity: any, data: any) => ({ ...data, id: entity === Group ? 'group-uuid' : 'member-uuid' })),
          save: jest.fn((e: any) => Promise.resolve(e)),
        };
        mockSeedService.seedGroup.mockResolvedValue(undefined);
        return cb(manager);
      });

      const result = await service.create('user-uuid', { name: 'Test Group' });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockSeedService.seedGroup).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // ─── addMember ────────────────────────────────────────────────────────────────

  describe('addMember', () => {
    it('should throw ForbiddenException if requester is not a member', async () => {
      mockMembersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember('group-uuid', 'user-uuid', { email: 'target@example.com' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if requester is not an admin', async () => {
      mockMembersRepo.findOne.mockResolvedValue(mockMember(GroupRole.MEMBER));

      await expect(
        service.addMember('group-uuid', 'user-uuid', { email: 'target@example.com' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if invited user does not exist', async () => {
      mockMembersRepo.findOne.mockResolvedValueOnce(mockMember(GroupRole.ADMIN));
      mockUsersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember('group-uuid', 'user-uuid', { email: 'nobody@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already a member', async () => {
      mockMembersRepo.findOne
        .mockResolvedValueOnce(mockMember(GroupRole.ADMIN))
        .mockResolvedValueOnce(mockMember());
      mockUsersRepo.findOne.mockResolvedValue(mockUser());

      await expect(
        service.addMember('group-uuid', 'user-uuid', { email: 'target@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should add a member with default MEMBER role', async () => {
      const newMember = mockMember();
      mockMembersRepo.findOne
        .mockResolvedValueOnce(mockMember(GroupRole.ADMIN))
        .mockResolvedValueOnce(null);
      mockUsersRepo.findOne.mockResolvedValue(mockUser());
      mockMembersRepo.create.mockReturnValue(newMember);
      mockMembersRepo.save.mockResolvedValue(newMember);

      const result = await service.addMember('group-uuid', 'user-uuid', { email: 'target@example.com' });

      expect(mockMembersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: GroupRole.MEMBER }),
      );
      expect(result).toEqual(newMember);
    });

    it('should add a member with specified role', async () => {
      const newMember = mockMember(GroupRole.ADMIN);
      mockMembersRepo.findOne
        .mockResolvedValueOnce(mockMember(GroupRole.ADMIN))
        .mockResolvedValueOnce(null);
      mockUsersRepo.findOne.mockResolvedValue(mockUser());
      mockMembersRepo.create.mockReturnValue(newMember);
      mockMembersRepo.save.mockResolvedValue(newMember);

      const result = await service.addMember('group-uuid', 'user-uuid', {
        email: 'target@example.com',
        role: GroupRole.ADMIN,
      });

      expect(mockMembersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: GroupRole.ADMIN }),
      );
      expect(result).toEqual(newMember);
    });
  });

  // ─── removeMember ─────────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('should throw ForbiddenException if requester is not a member', async () => {
      mockMembersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeMember('group-uuid', 'user-uuid', 'target-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if requester is not an admin', async () => {
      mockMembersRepo.findOne.mockResolvedValue(mockMember(GroupRole.MEMBER));

      await expect(
        service.removeMember('group-uuid', 'user-uuid', 'target-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if trying to remove self', async () => {
      mockMembersRepo.findOne.mockResolvedValue(mockMember(GroupRole.ADMIN));

      await expect(
        service.removeMember('group-uuid', 'user-uuid', 'user-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target member not found', async () => {
      mockMembersRepo.findOne
        .mockResolvedValueOnce(mockMember(GroupRole.ADMIN))
        .mockResolvedValueOnce(null);

      await expect(
        service.removeMember('group-uuid', 'user-uuid', 'target-uuid'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove the target member', async () => {
      const target = mockMember();
      mockMembersRepo.findOne
        .mockResolvedValueOnce(mockMember(GroupRole.ADMIN))
        .mockResolvedValueOnce(target);
      mockMembersRepo.remove.mockResolvedValue(undefined);

      await service.removeMember('group-uuid', 'user-uuid', 'target-uuid');

      expect(mockMembersRepo.remove).toHaveBeenCalledWith(target);
    });
  });

  // ─── validateMembership ───────────────────────────────────────────────────────

  describe('validateMembership', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockMembersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validateMembership('group-uuid', 'user-uuid'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return the GroupMember on success', async () => {
      const member = mockMember();
      mockMembersRepo.findOne.mockResolvedValue(member);

      const result = await service.validateMembership('group-uuid', 'user-uuid');

      expect(result).toEqual(member);
    });
  });
});
