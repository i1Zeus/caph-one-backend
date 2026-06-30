import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  getDashboardStats(@Query('workspaceId') workspaceId?: string) {
    return this.statisticsService.getDashboardStats(workspaceId);
  }

  @Get('tasks')
  getTaskAnalytics(@Query('workspaceId') workspaceId?: string) {
    return this.statisticsService.getTaskAnalytics(workspaceId);
  }

  @Get('users')
  getUserAnalytics() {
    return this.statisticsService.getUserAnalytics();
  }
}
