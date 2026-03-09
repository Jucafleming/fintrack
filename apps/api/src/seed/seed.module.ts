import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Category } from '../categories/category.entity';
import { PaymentMethod } from '../payment-methods/payment-method.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, PaymentMethod])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
