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
  CreatePurchaseInvoiceDto,
  ReturnPurchaseInvoiceDto,
  UpdatePurchaseInvoiceDto,
} from './dto';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@Controller('accounting/purchase-invoices')
@AutoAudit('PURCHASE_INVOICE')
@Auth()
export class PurchaseInvoicesController {
  private readonly logger = new Logger(PurchaseInvoicesController.name);

  constructor(
    private readonly purchaseInvoicesService: PurchaseInvoicesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPurchaseInvoiceDto: CreatePurchaseInvoiceDto,
    @Request() req: any,
  ) {
    this.logger.log('Creating new purchase invoice');
    return this.purchaseInvoicesService.create(
      createPurchaseInvoiceDto,
      req.user?.userId,
    );
  }

  @Get()
  async findAll(@Query() query: any) {
    this.logger.log('Getting all purchase invoices');
    return this.purchaseInvoicesService.findAll(query);
  }

  @Get('summary')
  async getInvoicesSummary(@Query() query: any) {
    this.logger.log('Getting purchase invoices summary');
    return this.purchaseInvoicesService.getInvoicesSummary(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting purchase invoice with id: ${id}`);
    return this.purchaseInvoicesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto,
  ) {
    this.logger.log(`Updating purchase invoice with id: ${id}`);
    return this.purchaseInvoicesService.update(id, updatePurchaseInvoiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Deleting purchase invoice with id: ${id}`);
    return this.purchaseInvoicesService.remove(id);
  }

  @Post(':id/return')
  @HttpCode(HttpStatus.CREATED)
  async returnInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() returnPurchaseInvoiceDto: ReturnPurchaseInvoiceDto,
    @Request() req: any,
  ) {
    this.logger.log(`Processing return for purchase invoice ${id}`);
    // Override purchaseInvoiceId from path param
    returnPurchaseInvoiceDto.purchaseInvoiceId = id;
    return this.purchaseInvoicesService.returnInvoice(
      returnPurchaseInvoiceDto,
      req.user?.userId,
    );
  }

  @Get(':id/payments')
  async getInvoicePayments(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    this.logger.log(`Getting payments for purchase invoice ${id}`);
    return this.purchaseInvoicesService.getInvoicePayments(
      id,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get(':id/effective-amounts')
  async getEffectiveAmounts(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Getting effective amounts for purchase invoice ${id}`);
    return this.purchaseInvoicesService.getEffectiveAmounts(id);
  }
}
