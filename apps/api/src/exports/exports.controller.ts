import { Controller, Get, Param, ParseUUIDPipe, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ExportsService } from './exports.service';
import { CurrentUser } from '../auth/decorators';
import { ListTransactionsDto } from '../transactions/dto';

@Controller('groups/:groupId/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('csv')
  exportCsv(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
    @Query() filters: ListTransactionsDto,
    @Res() res: Response,
  ) {
    return this.exportsService.exportCsv(groupId, userId, filters, res);
  }
}
