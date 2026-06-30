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
import { CreateBulkStocksDto } from './dto/create-bulk-stocks.dto';
import { CreateStockDto } from './dto/create-stock.dto';
import { StockAdjustmentDto } from './dto/stock-adjustment.dto';
import { StockQueryDto } from './dto/stock-query.dto';
import { StockTransferDto } from './dto/stock-transfer.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockService } from './stock.service';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createStockDto: CreateStockDto) {
    return this.stockService.create(createStockDto);
  }

  @Get()
  findAll(@Query() query: StockQueryDto) {
    return this.stockService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.stockService.getStockStats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.findOne(id);
  }

  @Get('product/:productId/warehouse/:warehouseId')
  findByProductAndWarehouse(
    @Param('productId', ParseIntPipe) productId: number,
    @Param('warehouseId', ParseIntPipe) warehouseId: number,
  ) {
    return this.stockService.findByProductAndWarehouse(productId, warehouseId);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  transferStock(@Body() transferDto: StockTransferDto) {
    return this.stockService.transferStock(transferDto);
  }

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  adjustStock(@Body() adjustmentDto: StockAdjustmentDto) {
    return this.stockService.adjustStock(adjustmentDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  createBulk(@Body() createBulkStocksDto: CreateBulkStocksDto) {
    return this.stockService.createBulk(createBulkStocksDto.stocks);
  }

  @Get('alerts')
  getStockAlerts() {
    return this.stockService.getStockAlerts();
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.stockService.update(id, updateStockDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.remove(id);
  }
}
