import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto, ListTransactionsDto } from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@Controller('groups/:groupId/transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  findAll(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: User,
    @Query() filters: ListTransactionsDto,
  ) {
    return this.transactionsService.findAll(groupId, user.id, filters);
  }

  @Post()
  create(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(groupId, user.id, dto);
  }

  @Patch(':id')
  update(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(groupId, id, user.id, dto);
  }

  @Delete(':id')
  remove(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.transactionsService.remove(groupId, id, user.id);
  }
}
