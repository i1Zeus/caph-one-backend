import { Controller, Get, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  getInventoryInfo() {
    return this.inventoryService.getSystemInfo();
  }

  @Get('dashboard')
  getDashboard() {
    return this.inventoryService.getDashboard();
  }

  @Get('health')
  getSystemHealth() {
    return this.inventoryService.getSystemHealth();
  }

  @Get('summary')
  getInventorySummary(@Query('period') period?: string) {
    return this.inventoryService.getInventorySummary(period);
  }

  @Get('alerts')
  getInventoryAlerts() {
    return this.inventoryService.getInventoryAlerts();
  }
}
