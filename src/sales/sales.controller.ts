import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { CreateDirectSaleDto, CreateQuotationDto, SaleQueryDto } from './dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // ============ Dashboard ============
  @Get('dashboard')
  getDashboardStats() {
    return this.salesService.getDashboardStats();
  }

  // ============ Products with stock ============
  @Get('products-with-stock')
  getProductsWithStock(
    @Query('warehouseId') warehouseId: string,
    @Query('search') search?: string,
  ) {
    return this.salesService.getProductsWithStock(Number(warehouseId), search);
  }

  // ============ Direct Sale ============
  @Post('direct')
  createDirectSale(@Body() dto: CreateDirectSaleDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.salesService.createDirectSale(dto, userId);
  }

  // ============ Quotation ============
  @Post('quotation')
  createQuotation(@Body() dto: CreateQuotationDto, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.salesService.createQuotation(dto, userId);
  }

  // ============ List ============
  @Get()
  findAll(@Query() query: SaleQueryDto) {
    return this.salesService.findAll(query);
  }

  // ============ Deliveries ============
  @Get('deliveries')
  getDeliveries(
    @Query() query: { page?: number; limit?: number; status?: string },
  ) {
    return this.salesService.getDeliveries(query);
  }

  // ============ Detail ============
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  // ============ Confirm Quotation ============
  @Post(':id/confirm')
  confirmQuotation(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.confirmQuotation(id);
  }

  // ============ Cancel Sale ============
  @Post(':id/cancel')
  cancelSale(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.cancelSale(id);
  }

  // ============ Validate Delivery ============
  @Put('deliveries/:id/validate')
  validateDelivery(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.salesService.validateDelivery(id, userId);
  }
}
