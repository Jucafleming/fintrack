import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupRole } from '@fintrack/shared';
import { Budget } from './budget.entity';
import { Category } from '../categories/category.entity';
import { GroupsService } from '../groups/groups.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget)
    private budgetsRepo: Repository<Budget>,
    @InjectRepository(Category)
    private categoriesRepo: Repository<Category>,
    private groupsService: GroupsService,
  ) {}

  async findAll(groupId: string, userId: string, month?: number, year?: number): Promise<Budget[]> {
    await this.groupsService.validateMembership(groupId, userId);

    const where: any = { groupId };
    if (month !== undefined) where.month = month;
    if (year !== undefined) where.year = year;

    return this.budgetsRepo.find({ where, relations: ['category'] });
  }

  async create(groupId: string, userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const member = await this.groupsService.validateMembership(groupId, userId);
    this.assertAdmin(member.role);

    await this.validateCategoryBelongsToGroup(dto.categoryId, groupId);

    const existing = await this.budgetsRepo.findOne({
      where: { groupId, categoryId: dto.categoryId, month: dto.month, year: dto.year },
    });
    if (existing) {
      throw new ConflictException('A budget for this category and period already exists');
    }

    const budget = this.budgetsRepo.create({ ...dto, groupId });
    return this.budgetsRepo.save(budget);
  }

  async update(groupId: string, id: string, userId: string, dto: UpdateBudgetDto): Promise<Budget> {
    const member = await this.groupsService.validateMembership(groupId, userId);
    this.assertAdmin(member.role);

    const budget = await this.findOneOrFail(groupId, id);
    Object.assign(budget, dto);
    return this.budgetsRepo.save(budget);
  }

  async remove(groupId: string, id: string, userId: string): Promise<void> {
    const member = await this.groupsService.validateMembership(groupId, userId);
    this.assertAdmin(member.role);

    const budget = await this.findOneOrFail(groupId, id);
    await this.budgetsRepo.remove(budget);
  }

  private async findOneOrFail(groupId: string, id: string): Promise<Budget> {
    const budget = await this.budgetsRepo.findOne({ where: { id, groupId } });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  private assertAdmin(role: GroupRole): void {
    if (role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }

  private async validateCategoryBelongsToGroup(categoryId: string, groupId: string): Promise<void> {
    const category = await this.categoriesRepo.findOne({ where: { id: categoryId, groupId } });
    if (!category) {
      throw new UnprocessableEntityException('Category does not belong to this group');
    }
  }
}
