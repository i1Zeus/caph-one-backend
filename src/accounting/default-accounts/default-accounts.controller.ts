import { Body, Controller, Get, Logger, Patch } from '@nestjs/common';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import { DefaultAccountsService } from './default-accounts.service';
import { UpdateDefaultAccountsDto } from './dto';

@Controller('accounting/default-accounts')
@AutoAudit('ACCOUNTING')
@Auth()
export class DefaultAccountsController {
  private readonly logger = new Logger(DefaultAccountsController.name);

  constructor(
    private readonly defaultAccountsService: DefaultAccountsService,
  ) {}

  @Get()
  async getDefaultAccounts() {
    this.logger.log('Getting default accounts');
    return this.defaultAccountsService.getDefaultAccounts();
  }

  @Patch()
  async updateDefaultAccounts(@Body() dto: UpdateDefaultAccountsDto) {
    this.logger.log('Updating default accounts');
    return this.defaultAccountsService.updateDefaultAccounts(dto);
  }
}
