import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Logger,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  CreateTransactionDto,
} from './dto';
import { AccountType } from '@prisma/client';
import { Auth } from '../../auth';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';

@Controller('accounting/accounts')
@AutoAudit('ACCOUNT')
@Auth()
export class AccountsController {
  private readonly logger = new Logger(AccountsController.name);

  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAccountDto: CreateAccountDto) {
    this.logger.log('Creating new account');
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  async findAll(
    @Query('type') type?: AccountType,
    @Query('isCash') isCash?: string,
  ) {
    this.logger.log('Getting all accounts');
    const filters: any = {};
    if (type) filters.type = type;
    if (isCash !== undefined) filters.isCash = isCash === 'true';
    return this.accountsService.findAll(filters);
  }

  @Get('summary')
  async getAccountsSummary() {
    this.logger.log('Getting accounts summary');
    return this.accountsService.getAccountsSummary();
  }

  @Get('tree')
  async findAllAsTree(
    @Query('type') type?: AccountType,
    @Query('isCash') isCash?: string,
  ) {
    this.logger.log('Getting accounts as tree structure');
    const filters: any = {};
    if (type) filters.type = type;
    if (isCash !== undefined) filters.isCash = isCash === 'true';
    return this.accountsService.findAllAsTree(filters);
  }

  @Get('potential-parents/:type')
  async getPotentialParents(
    @Param('type') type: AccountType,
    @Query('excludeId') excludeId?: string,
  ) {
    this.logger.log(`Getting potential parent accounts for type: ${type}`);
    const excludeIdNumber = excludeId ? parseInt(excludeId) : undefined;
    return this.accountsService.findPotentialParents(type, excludeIdNumber);
  }

  @Get('non-client-linked')
  async getNonClientLinkedAccounts(@Query('type') type?: AccountType) {
    this.logger.log('Getting accounts not linked to clients');
    const filters = type ? { type } : {};
    return this.accountsService.findNonClientLinkedAccounts(filters);
  }

  @Get('cash')
  async getCashAccounts() {
    this.logger.log('Getting cash accounts');
    return this.accountsService.getCashAccounts();
  }

  @Get('search')
  async searchAccounts(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('isCash') isCash?: string,
    @Query('type') type?: AccountType,
  ) {
    this.logger.log(
      `Searching accounts with query: ${search}, isCash: ${isCash}, type: ${type}`,
    );
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const isCashBool =
      isCash === 'true' ? true : isCash === 'false' ? false : undefined;
    return this.accountsService.searchAccounts(
      search || '',
      limitNum,
      isCashBool,
      type,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting account with id: ${id}`);
    return this.accountsService.findOne(id);
  }

  @Get(':id/children')
  async getAccountChildren(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting children for account: ${id}`);
    return this.accountsService.getAccountChildren(id);
  }

  @Get(':id/balance')
  async getAccountBalance(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeChildren') includeChildren?: string,
  ) {
    this.logger.log(`Getting balance for account: ${id}`);
    const includeChildrenFlag =
      includeChildren === 'true' || includeChildren === undefined; // Default to true
    return this.accountsService.getAccountBalance(id, includeChildrenFlag);
  }

  @Get(':id/transactions')
  async getAccountTransactions(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting transactions for account: ${id}`);
    return this.accountsService.getAccountTransactions(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAccountDto: UpdateAccountDto,
  ) {
    this.logger.log(`Updating account with id: ${id}`);
    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting account with id: ${id}`);
    return this.accountsService.remove(id);
  }

  @Post('transactions')
  @HttpCode(HttpStatus.CREATED)
  async createTransaction(@Body() createTransactionDto: CreateTransactionDto) {
    this.logger.log('Creating new accounting transaction');
    return this.accountsService.createTransaction(createTransactionDto);
  }
}
