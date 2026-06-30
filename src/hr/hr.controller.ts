import { Controller, Get } from '@nestjs/common';
import { Auth } from '../auth';
import { HrService } from './hr.service';

@Controller('hr')
@Auth()
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('dashboard')
  getDashboardStats() {
    return this.hrService.getDashboardStats();
  }

  @Get('overview')
  getOverview() {
    return this.hrService.getOverview();
  }
}
