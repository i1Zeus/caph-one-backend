import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsQueryDto } from './dto';
import { PosAnalyticsService } from './pos-analytics.service';

@Controller('pos/analytics')
export class PosAnalyticsController {
  constructor(private readonly analyticsService: PosAnalyticsService) {}

  /**
   * Get top-selling products by revenue
   * GET /pos/analytics/top-products?limit=10&startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('top-products')
  async getTopProducts(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTopProducts(query);
  }

  /**
   * Get top-performing employees by sales
   * GET /pos/analytics/top-employees?limit=10&startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('top-employees')
  async getTopEmployees(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getTopEmployees(query);
  }

  /**
   * Get sales breakdown for each employee
   * GET /pos/analytics/employees?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('employees')
  async getEmployeeSalesBreakdown(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getEmployeeSalesBreakdown(query);
  }

  /**
   * Get detailed product sales table with pricing, cost, quantity, and revenue
   * GET /pos/analytics/products?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get('products')
  async getProductSalesTable(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getProductSalesTable(query);
  }
}
