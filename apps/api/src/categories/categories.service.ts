import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { GroupsService } from '../groups/groups.service';
import { GroupRole } from '@fintrack/shared';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepo: Repository<Category>,
    private groupsService: GroupsService,
  ) {}

  async findAll(groupId: string, userId: string, includeArchived = false): Promise<Category[]> {
    await this.groupsService.validateMembership(groupId, userId);

    const qb = this.categoriesRepo
      .createQueryBuilder('category')
      .where('category.groupId = :groupId', { groupId });

    if (!includeArchived) {
      qb.andWhere('category.archivedAt IS NULL');
    }

    return qb.orderBy('category.name', 'ASC').getMany();
  }

  async create(groupId: string, userId: string, dto: CreateCategoryDto): Promise<Category> {
    await this.validateAdmin(groupId, userId);

    const existing = await this.categoriesRepo.findOne({
      where: { groupId, name: dto.name },
    });
    if (existing) throw new ConflictException('A category with this name already exists in the group');

    const category = this.categoriesRepo.create({
      groupId,
      name: dto.name,
      color: dto.color ?? '#6366f1',
      isDefault: false,
    });

    return this.categoriesRepo.save(category);
  }

  async update(groupId: string, id: string, userId: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.validateAdmin(groupId, userId);

    const category = await this.findOneOrFail(groupId, id);

    if (dto.name && dto.name !== category.name) {
      const existing = await this.categoriesRepo.findOne({
        where: { groupId, name: dto.name },
      });
      if (existing) throw new ConflictException('A category with this name already exists in the group');
    }

    Object.assign(category, dto);
    return this.categoriesRepo.save(category);
  }

  async remove(groupId: string, id: string, userId: string): Promise<void> {
    await this.validateAdmin(groupId, userId);

    const category = await this.findOneOrFail(groupId, id);

    if (category.isDefault) {
      category.archivedAt = new Date();
      await this.categoriesRepo.save(category);
    } else {
      await this.categoriesRepo.remove(category);
    }
  }

  private async findOneOrFail(groupId: string, id: string): Promise<Category> {
    const category = await this.categoriesRepo.findOne({ where: { id, groupId } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  private async validateAdmin(groupId: string, userId: string): Promise<void> {
    const member = await this.groupsService.validateMembership(groupId, userId);
    if (member.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
