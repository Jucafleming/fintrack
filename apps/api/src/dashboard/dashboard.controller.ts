import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/decorators';

@Controller('groups/:groupId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.dashboardService.getMonthlySummary(groupId, userId, Number(month), Number(year));
  }

  @Get('by-category')
  getByCategory(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.dashboardService.getByCategory(groupId, userId, Number(month), Number(year));
  }

  @Get('monthly-trend')
  getMonthlyTrend(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dashboardService.getMonthlyTrend(groupId, userId);
  }

  @Get('by-ownership')
  getByOwnership(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.dashboardService.getByOwnership(groupId, userId, Number(month), Number(year));
  }

  @Get('budget-alerts')
  getBudgetAlerts(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @CurrentUser('id') userId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.dashboardService.getBudgetAlerts(groupId, userId, Number(month), Number(year));
  }
}
