import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateWarehouseTransactionDto } from './dto/create-warehouse-transaction.dto';
import { UpdateWarehouseTransactionDto } from './dto/update-warehouse-transaction.dto';
import { WarehouseTransactionQueryDto } from './dto/warehouse-transaction-query.dto';
import { WarehouseTransactionsService } from './warehouse-transactions.service';

@Controller('warehouse-transactions')
export class WarehouseTransactionsController {
  constructor(
    private readonly warehouseTransactionsService: WarehouseTransactionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTransactionDto: CreateWarehouseTransactionDto) {
    return this.warehouseTransactionsService.create(createTransactionDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  createBulk(@Body() createTransactionDtos: CreateWarehouseTransactionDto[]) {
    return this.warehouseTransactionsService.createBulk(createTransactionDtos);
  }

  @Get()
  findAll(@Query() query: WarehouseTransactionQueryDto) {
    return this.warehouseTransactionsService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.warehouseTransactionsService.getTransactionStats();
  }

  @Get('product/:productId/history')
  getProductHistory(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('limit') limit?: number,
  ) {
    return this.warehouseTransactionsService.getProductTransactionHistory(
      productId,
      limit,
    );
  }

  @Get('warehouse/:warehouseId/history')
  getWarehouseHistory(
    @Param('warehouseId', ParseIntPipe) warehouseId: number,
    @Query('limit') limit?: number,
  ) {
    return this.warehouseTransactionsService.getWarehouseTransactionHistory(
      warehouseId,
      limit,
    );
  }

  @Get('daily/:date')
  getDailyTransactions(@Param('date') date: string) {
    return this.warehouseTransactionsService.getDailyTransactions(date);
  }

  @Get('returns')
  getAllReturns(@Query() query: WarehouseTransactionQueryDto) {
    return this.warehouseTransactionsService.getAllReturns(query);
  }

  @Get('returns/sales-invoice/:invoiceId')
  getReturnsBySalesInvoice(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
  ) {
    return this.warehouseTransactionsService.getReturnsByInvoice(
      'sales',
      invoiceId,
    );
  }

  @Get('returns/purchase-invoice/:invoiceId')
  getReturnsByPurchaseInvoice(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
  ) {
    return this.warehouseTransactionsService.getReturnsByInvoice(
      'purchase',
      invoiceId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseTransactionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTransactionDto: UpdateWarehouseTransactionDto,
  ) {
    return this.warehouseTransactionsService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseTransactionsService.remove(id);
  }
}
