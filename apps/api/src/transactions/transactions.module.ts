import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { Installment } from './installment.entity';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { GroupsModule } from '../groups/groups.module';
import { Category } from '../categories/category.entity';
import { PaymentMethod } from '../payment-methods/payment-method.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Installment, Category, PaymentMethod]),
    GroupsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
