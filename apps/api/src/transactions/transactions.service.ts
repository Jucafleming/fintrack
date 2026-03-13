import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionType, Ownership } from '@fintrack/shared';
import { Transaction } from './transaction.entity';
import { Installment } from './installment.entity';
import { GroupsService } from '../groups/groups.service';
import { Category } from '../categories/category.entity';
import { PaymentMethod } from '../payment-methods/payment-method.entity';
import { CreateTransactionDto, UpdateTransactionDto, ListTransactionsDto } from './dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionsRepo: Repository<Transaction>,
    @InjectRepository(Installment)
    private installmentsRepo: Repository<Installment>,
    @InjectRepository(Category)
    private categoriesRepo: Repository<Category>,
    @InjectRepository(PaymentMethod)
    private paymentMethodsRepo: Repository<PaymentMethod>,
    private groupsService: GroupsService,
    private dataSource: DataSource,
  ) {}

  async findAll(groupId: string, userId: string, filters: ListTransactionsDto): Promise<Transaction[]> {
    await this.groupsService.validateMembership(groupId, userId);

    const qb = this.transactionsRepo
      .createQueryBuilder('t')
      .where('t.groupId = :groupId', { groupId })
      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('t.user', 'user')
      .orderBy('t.date', 'DESC')
      .addOrderBy('t.createdAt', 'DESC');

    if (filters.type) {
      qb.andWhere('t.type = :type', { type: filters.type });
    }

    if (filters.categoryId) {
      qb.andWhere('t.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.paymentMethodId) {
      qb.andWhere('t.paymentMethodId = :paymentMethodId', { paymentMethodId: filters.paymentMethodId });
    }

    if (filters.startDate) {
      qb.andWhere('t.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      qb.andWhere('t.date <= :endDate', { endDate: filters.endDate });
    }

    if (filters.month && filters.year) {
      qb.andWhere('EXTRACT(MONTH FROM t.date) = :month', { month: filters.month });
      qb.andWhere('EXTRACT(YEAR FROM t.date) = :year', { year: filters.year });
    } else if (filters.month) {
      qb.andWhere('EXTRACT(MONTH FROM t.date) = :month', { month: filters.month });
    } else if (filters.year) {
      qb.andWhere('EXTRACT(YEAR FROM t.date) = :year', { year: filters.year });
    }

    return qb.getMany();
  }

  async create(groupId: string, userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    await this.groupsService.validateMembership(groupId, userId);

    if (dto.type === TransactionType.INSTALLMENT) {
      if (!dto.installmentCount || dto.installmentCount < 2) {
        throw new BadRequestException('installmentCount must be at least 2 for INSTALLMENT type');
      }
    }

    if (dto.categoryId) {
      await this.validateCategoryBelongsToGroup(dto.categoryId, groupId);
    }

    if (dto.paymentMethodId) {
      await this.validatePaymentMethodBelongsToGroup(dto.paymentMethodId, groupId);
    }

    return this.dataSource.transaction(async (manager) => {
      const transaction = manager.create(Transaction, {
        groupId,
        userId,
        title: dto.title,
        amount: dto.amount,
        date: new Date(dto.date),
        type: dto.type,
        ownership: dto.ownership ?? Ownership.SHARED,
        categoryId: dto.categoryId ?? null,
        paymentMethodId: dto.paymentMethodId ?? null,
        isPaid: dto.isPaid ?? false,
        installmentCount: dto.installmentCount ?? null,
        notes: dto.notes ?? null,
      });

      await manager.save(transaction);

      if (dto.type === TransactionType.INSTALLMENT) {
        const installmentAmount = Number((dto.amount / dto.installmentCount).toFixed(2));
        const installments: Installment[] = [];

        for (let i = 1; i <= dto.installmentCount; i++) {
          const dueDate = new Date(dto.date);
          dueDate.setMonth(dueDate.getMonth() + (i - 1));

          installments.push(
            manager.create(Installment, {
              transactionId: transaction.id,
              number: i,
              amount: installmentAmount,
              dueDate,
              isPaid: false,
            }),
          );
        }

        await manager.save(installments);
      }

      return transaction;
    });
  }

  async update(groupId: string, id: string, userId: string, dto: UpdateTransactionDto): Promise<Transaction> {
    await this.groupsService.validateMembership(groupId, userId);

    const transaction = await this.findOneOrFail(groupId, id);
    this.assertOwner(transaction, userId);

    if (dto.categoryId) {
      await this.validateCategoryBelongsToGroup(dto.categoryId, groupId);
    }

    if (dto.paymentMethodId) {
      await this.validatePaymentMethodBelongsToGroup(dto.paymentMethodId, groupId);
    }

    if (dto.date) {
      (dto as any).date = new Date(dto.date);
    }

    Object.assign(transaction, dto);
    return this.transactionsRepo.save(transaction);
  }

  async remove(groupId: string, id: string, userId: string): Promise<void> {
    await this.groupsService.validateMembership(groupId, userId);

    const transaction = await this.findOneOrFail(groupId, id);
    this.assertOwner(transaction, userId);

    await this.transactionsRepo.softRemove(transaction);
  }

  private async findOneOrFail(groupId: string, id: string): Promise<Transaction> {
    const transaction = await this.transactionsRepo.findOne({ where: { id, groupId } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  private assertOwner(transaction: Transaction, userId: string): void {
    if (transaction.userId !== userId) {
      throw new ForbiddenException('You can only modify your own transactions');
    }
  }

  private async validateCategoryBelongsToGroup(categoryId: string, groupId: string): Promise<void> {
    const category = await this.categoriesRepo.findOne({ where: { id: categoryId, groupId } });
    if (!category) {
      throw new UnprocessableEntityException('Category does not belong to this group');
    }
  }

  private async validatePaymentMethodBelongsToGroup(paymentMethodId: string, groupId: string): Promise<void> {
    const pm = await this.paymentMethodsRepo.findOne({ where: { id: paymentMethodId, groupId } });
    if (!pm) {
      throw new UnprocessableEntityException('Payment method does not belong to this group');
    }
  }
}
