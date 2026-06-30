import { Controller, Get, Logger } from '@nestjs/common';
import { AutoAudit } from '../audit/interceptors/audit.interceptor';
import { Auth } from '../auth';
import { AccountingService } from './accounting.service';

@Controller('accounting')
@AutoAudit('ACCOUNTING')
@Auth()
export class AccountingController {
  private readonly logger = new Logger(AccountingController.name);

  constructor(private readonly accountingService: AccountingService) {}

  @Get('dashboard')
  async getDashboard() {
    this.logger.log('Getting accounting dashboard data');
    return this.accountingService.getDashboardSummary();
  }
}
