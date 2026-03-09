import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Category } from '../categories/category.entity';
import { PaymentMethod } from '../payment-methods/payment-method.entity';
import { DEFAULT_CATEGORIES } from './data/default-categories';
import { DEFAULT_PAYMENT_METHODS } from './data/default-payment-methods';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepo: Repository<Category>,
    @InjectRepository(PaymentMethod)
    private paymentMethodsRepo: Repository<PaymentMethod>,
  ) {}

  async seedGroup(groupId: string, manager?: EntityManager): Promise<void> {
    const categoryRepo = manager
      ? manager.getRepository(Category)
      : this.categoriesRepo;

    const paymentMethodRepo = manager
      ? manager.getRepository(PaymentMethod)
      : this.paymentMethodsRepo;

    const categories = DEFAULT_CATEGORIES.map((c) =>
      categoryRepo.create({ ...c, groupId, isDefault: true }),
    );

    const paymentMethods = DEFAULT_PAYMENT_METHODS.map((p) =>
      paymentMethodRepo.create({ ...p, groupId, isDefault: true }),
    );

    await categoryRepo.save(categories);
    await paymentMethodRepo.save(paymentMethods);
  }
}
