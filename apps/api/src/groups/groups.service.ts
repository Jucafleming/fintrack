import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { GroupRole } from '@fintrack/shared';
import { Group } from './group.entity';
import { GroupMember } from './group-member.entity';
import { User } from '../users/user.entity';
import { SeedService } from '../seed/seed.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupsRepo: Repository<Group>,
    @InjectRepository(GroupMember)
    private membersRepo: Repository<GroupMember>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    private seedService: SeedService,
    private dataSource: DataSource,
  ) {}

  async findAllByUser(userId: string): Promise<Group[]> {
    return this.groupsRepo
      .createQueryBuilder('group')
      .innerJoin('group.members', 'member', 'member.userId = :userId', { userId })
      .leftJoinAndSelect('group.members', 'allMembers')
      .leftJoinAndSelect('allMembers.user', 'user')
      .getMany();
  }

  async create(userId: string, dto: CreateGroupDto): Promise<Group> {
    return this.dataSource.transaction(async (manager) => {
      const group = manager.create(Group, { name: dto.name });
      await manager.save(group);

      const member = manager.create(GroupMember, {
        userId,
        groupId: group.id,
        role: GroupRole.ADMIN,
      });
      await manager.save(member);

      await this.seedService.seedGroup(group.id, manager);

      return group;
    });
  }

  async addMember(groupId: string, requesterId: string, dto: AddMemberDto): Promise<GroupMember> {
    await this.validateAdmin(groupId, requesterId);

    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.membersRepo.findOne({
      where: { groupId, userId: user.id },
    });
    if (existing) throw new ConflictException('User is already a member of this group');

    const member = this.membersRepo.create({
      groupId,
      userId: user.id,
      role: dto.role ?? GroupRole.MEMBER,
    });

    return this.membersRepo.save(member);
  }

  async removeMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
    await this.validateAdmin(groupId, requesterId);

    if (requesterId === targetUserId) {
      throw new ForbiddenException('You cannot remove yourself from the group');
    }

    const member = await this.membersRepo.findOne({
      where: { groupId, userId: targetUserId },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.membersRepo.remove(member);
  }

  async validateMembership(groupId: string, userId: string): Promise<GroupMember> {
    const member = await this.membersRepo.findOne({ where: { groupId, userId } });
    if (!member) throw new ForbiddenException('You are not a member of this group');
    return member;
  }

  private async validateAdmin(groupId: string, userId: string): Promise<void> {
    const member = await this.membersRepo.findOne({ where: { groupId, userId } });
    if (!member) throw new ForbiddenException('You are not a member of this group');
    if (member.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
