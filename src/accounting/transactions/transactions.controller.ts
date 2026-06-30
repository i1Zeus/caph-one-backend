import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import {
  CreateTransactionDto,
  FilterTransactionsDto,
  UpdateTransactionDto,
} from './dto';
import { TransactionsService } from './transactions.service';

@Controller('accounting/transactions')
@AutoAudit('TRANSACTION')
@Auth()
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req: any,
  ) {
    this.logger.log('Creating new accounting transaction');
    const userId = req.user?.userId;
    return this.transactionsService.create(createTransactionDto, userId);
  }

  @Get()
  async findAll(@Query() filters: FilterTransactionsDto) {
    this.logger.log('Getting all transactions with filters:', filters);
    return this.transactionsService.findAll(filters);
  }

  @Get('summary')
  async getTransactionsSummary(@Query() filters: FilterTransactionsDto) {
    this.logger.log('Getting transactions summary');
    return this.transactionsService.getTransactionsSummary(filters);
  }

  @Get('accounts/:accountId/balance')
  async getAccountBalance(@Param('accountId', ParseIntPipe) accountId: number) {
    this.logger.log(`Getting balance for account: ${accountId}`);
    return this.transactionsService.getAccountBalance(accountId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting transaction with id: ${id}`);
    return this.transactionsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionDto: UpdateTransactionDto,
  ) {
    this.logger.log(`Updating transaction with id: ${id}`);
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting transaction with id: ${id}`);
    return this.transactionsService.remove(id);
  }
}
