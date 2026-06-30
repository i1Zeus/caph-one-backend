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
  CreatePurchaseReturnInvoiceDto,
  UpdatePurchaseReturnInvoiceDto,
} from './dto';
import { PurchaseReturnInvoicesService } from './purchase-return-invoices.service';

@Controller('accounting/purchase-return-invoices')
@AutoAudit('PURCHASE_RETURN_INVOICE')
@Auth()
export class PurchaseReturnInvoicesController {
  private readonly logger = new Logger(PurchaseReturnInvoicesController.name);

  constructor(
    private readonly purchaseReturnInvoicesService: PurchaseReturnInvoicesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreatePurchaseReturnInvoiceDto,
    @Request() req: any,
  ) {
    this.logger.log(
      `Creating purchase return invoice for purchase invoice: ${createDto.purchaseInvoiceId}`,
    );
    return this.purchaseReturnInvoicesService.create(
      createDto,
      req.user?.userId,
    );
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

    return this.purchaseReturnInvoicesService.findAll(
      filters,
      userId,
      departmentId,
      isInventoryAdmin,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseReturnInvoicesService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePurchaseReturnInvoiceDto,
  ) {
    return this.purchaseReturnInvoicesService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseReturnInvoicesService.remove(id);
  }

  @Get('original/:invoiceId/returnable-items')
  async getReturnableItems(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
  ) {
    return this.purchaseReturnInvoicesService.getReturnableItems(invoiceId);
  }
}
