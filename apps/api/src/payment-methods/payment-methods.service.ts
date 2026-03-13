import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { GroupsService } from '../groups/groups.service';
import { GroupRole } from '@fintrack/shared';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @InjectRepository(PaymentMethod)
    private paymentMethodsRepo: Repository<PaymentMethod>,
    private groupsService: GroupsService,
  ) {}

  async findAll(groupId: string, userId: string, includeArchived = false): Promise<PaymentMethod[]> {
    await this.groupsService.validateMembership(groupId, userId);

    const qb = this.paymentMethodsRepo
      .createQueryBuilder('pm')
      .where('pm.groupId = :groupId', { groupId });

    if (!includeArchived) {
      qb.andWhere('pm.archivedAt IS NULL');
    }

    return qb.orderBy('pm.name', 'ASC').getMany();
  }

  async create(groupId: string, userId: string, dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    await this.validateAdmin(groupId, userId);

    const existing = await this.paymentMethodsRepo.findOne({
      where: { groupId, name: dto.name },
    });
    if (existing) throw new ConflictException('A payment method with this name already exists in the group');

    const paymentMethod = this.paymentMethodsRepo.create({
      groupId,
      name: dto.name,
      isDefault: false,
    });

    return this.paymentMethodsRepo.save(paymentMethod);
  }

  async update(groupId: string, id: string, userId: string, dto: UpdatePaymentMethodDto): Promise<PaymentMethod> {
    await this.validateAdmin(groupId, userId);

    const paymentMethod = await this.findOneOrFail(groupId, id);

    if (dto.name && dto.name !== paymentMethod.name) {
      const existing = await this.paymentMethodsRepo.findOne({
        where: { groupId, name: dto.name },
      });
      if (existing) throw new ConflictException('A payment method with this name already exists in the group');
    }

    Object.assign(paymentMethod, dto);
    return this.paymentMethodsRepo.save(paymentMethod);
  }

  async remove(groupId: string, id: string, userId: string): Promise<void> {
    await this.validateAdmin(groupId, userId);

    const paymentMethod = await this.findOneOrFail(groupId, id);

    if (paymentMethod.isDefault) {
      paymentMethod.archivedAt = new Date();
      await this.paymentMethodsRepo.save(paymentMethod);
    } else {
      await this.paymentMethodsRepo.remove(paymentMethod);
    }
  }

  private async findOneOrFail(groupId: string, id: string): Promise<PaymentMethod> {
    const pm = await this.paymentMethodsRepo.findOne({ where: { id, groupId } });
    if (!pm) throw new NotFoundException('Payment method not found');
    return pm;
  }

  private async validateAdmin(groupId: string, userId: string): Promise<void> {
    const member = await this.groupsService.validateMembership(groupId, userId);
    if (member.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Only admins can perform this action');
    }
  }
}
