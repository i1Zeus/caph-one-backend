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
  CreateSalesInvoiceDto,
  ReturnSalesInvoiceDto,
  UpdateSalesInvoiceDto,
} from './dto';
import { SalesInvoicesService } from './sales-invoices.service';

@Controller('accounting/sales-invoices')
@AutoAudit('SALES_INVOICE')
@Auth()
export class SalesInvoicesController {
  private readonly logger = new Logger(SalesInvoicesController.name);

  constructor(private readonly salesInvoicesService: SalesInvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSalesInvoiceDto: CreateSalesInvoiceDto,
    @Request() req: any,
  ) {
    this.logger.log('Creating new sales invoice');
    return this.salesInvoicesService.create(
      createSalesInvoiceDto,
      req.user?.userId,
    );
  }

  @Get()
  async findAll(@Query() query: any) {
    this.logger.log('Getting all sales invoices');
    return this.salesInvoicesService.findAll(query);
  }

  @Get('summary')
  async getInvoicesSummary(@Query() query: any) {
    this.logger.log('Getting sales invoices summary');
    return this.salesInvoicesService.getInvoicesSummary(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting sales invoice with id: ${id}`);
    return this.salesInvoicesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSalesInvoiceDto: UpdateSalesInvoiceDto,
  ) {
    this.logger.log(`Updating sales invoice with id: ${id}`);
    return this.salesInvoicesService.update(id, updateSalesInvoiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting sales invoice with id: ${id}`);
    return this.salesInvoicesService.remove(id);
  }

  @Post(':id/return')
  @HttpCode(HttpStatus.CREATED)
  async returnInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() returnSalesInvoiceDto: ReturnSalesInvoiceDto,
    @Request() req: any,
  ) {
    this.logger.log(`Processing return for sales invoice ${id}`);
    // Override salesInvoiceId from path param
    returnSalesInvoiceDto.salesInvoiceId = id;
    return this.salesInvoicesService.returnInvoice(
      returnSalesInvoiceDto,
      req.user?.userId,
    );
  }

  @Get(':id/receipts')
  async getInvoiceReceipts(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    this.logger.log(`Getting receipts for sales invoice ${id}`);
    return this.salesInvoicesService.getInvoiceReceipts(
      id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id/effective-amounts')
  async getEffectiveAmounts(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting effective amounts for sales invoice ${id}`);
    return this.salesInvoicesService.getEffectiveAmounts(id);
  }
}
