import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { Budget } from '../budgets/budget.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Budget]), GroupsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
