import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../transactions/transaction.entity';
import { ExportsService } from './exports.service';
import { ExportsController } from './exports.controller';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction]), GroupsModule],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
