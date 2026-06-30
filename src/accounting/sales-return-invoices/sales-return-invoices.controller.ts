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
  Post,
  Put,
  Query,
  Request,
} from '@nestjs/common';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import {
  CreateSalesReturnInvoiceDto,
  UpdateSalesReturnInvoiceDto,
} from './dto';
import { SalesReturnInvoicesService } from './sales-return-invoices.service';

@Controller('accounting/sales-return-invoices')
@AutoAudit('SALES_RETURN_INVOICE')
@Auth()
export class SalesReturnInvoicesController {
  private readonly logger = new Logger(SalesReturnInvoicesController.name);

  constructor(
    private readonly salesReturnInvoicesService: SalesReturnInvoicesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateSalesReturnInvoiceDto,
    @Request() req: any,
  ) {
    this.logger.log(
      `Creating sales return invoice for sales invoice: ${createDto.salesInvoiceId}`,
    );
    return this.salesReturnInvoicesService.create(createDto, req.user?.userId);
  }

  @Get()
  async findAll(@Query() filters: any, @Request() req: any) {
    const userId = req.user?.id;
    const departmentId = req.user?.departmentId || null;
    const permissions = req.user?.permissions || [];
    const isInventoryAdmin =
      permissions.includes('*') || permissions.includes('inventory:admin');

    // Ignore departmentId from query if user is not admin
    if (!isInventoryAdmin && filters.departmentId) {
      delete filters.departmentId;
    }

    return this.salesReturnInvoicesService.findAll(
      filters,
      userId,
      departmentId,
      isInventoryAdmin,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesReturnInvoicesService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSalesReturnInvoiceDto,
  ) {
    return this.salesReturnInvoicesService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesReturnInvoicesService.remove(id);
  }

  @Get('original/:invoiceId/returnable-items')
  async getReturnableItems(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
  ) {
    return this.salesReturnInvoicesService.getReturnableItems(invoiceId);
  }
}
