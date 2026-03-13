import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@Controller('groups/:groupId/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  findAll(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.budgetsService.findAll(groupId, userId, month, year);
  }

  @Post()
  create(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.budgetsService.create(groupId, userId, dto);
  }

  @Patch(':id')
  update(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(groupId, id, userId, dto);
  }

  @Delete(':id')
  remove(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.budgetsService.remove(groupId, id, userId);
  }
}
