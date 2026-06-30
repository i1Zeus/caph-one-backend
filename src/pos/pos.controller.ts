import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreatePosReturnDto,
  CreatePosTransactionDto,
  PosQueryDto,
} from './dto';
import { PosService } from './pos.service';

@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('products')
  async getProducts(@Query() query: PosQueryDto) {
    return this.posService.getProductsForPOS(query);
  }

  @Get('products/barcode/:barcode')
  async getProductByBarcode(
    @Param('barcode') barcode: string,
    @Query('warehouseId', ParseIntPipe) warehouseId?: number,
  ) {
    return this.posService.getProductByBarcode(barcode, warehouseId);
  }

  @Post('transaction')
  async processTransaction(@Body() dto: CreatePosTransactionDto) {
    // Employee ID is now passed in the DTO for POS transactions
    return this.posService.processTransaction(dto, dto.employeeId);
  }

  @Get('transactions/:sessionId')
  async getSessionTransactions(
    @Param('sessionId', ParseIntPipe) sessionId: number,
  ) {
    return this.posService.getSessionTransactions(sessionId);
  }

  @Get('categories')
  async getCategories(@Query() query: PosQueryDto) {
    return this.posService.getCategoriesForPOS(query);
  }

  @Get('terminals/:posId/invoices')
  async getTerminalInvoices(@Param('posId', ParseIntPipe) posId: number) {
    return this.posService.getTerminalInvoices(posId);
  }

  @Get('invoices/:invoiceId/return-details')
  async getInvoiceForReturn(
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Query('posId', ParseIntPipe) posId: number,
  ) {
    return this.posService.getInvoiceForReturn(invoiceId, posId);
  }

  @Post('returns')
  async processReturn(@Body() dto: CreatePosReturnDto) {
    // Employee ID is passed in the DTO for return transactions
    return this.posService.processReturn(dto, dto.employeeId);
  }
}
