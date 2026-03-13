import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from './budget.entity';
import { Category } from '../categories/category.entity';
import { BudgetsService } from './budgets.service';
import { BudgetsController } from './budgets.controller';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Category]), GroupsModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
