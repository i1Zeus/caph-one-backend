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
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseQueryDto } from './dto/warehouse-query.dto';
import { WarehousesService } from './warehouses.service';

@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createWarehouseDto: CreateWarehouseDto) {
    return this.warehousesService.create(createWarehouseDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  createBulk(@Body() createWarehouseDtos: CreateWarehouseDto[]) {
    return this.warehousesService.createBulk(createWarehouseDtos);
  }

  @Get()
  findAll(@Query() query: WarehouseQueryDto) {
    return this.warehousesService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.warehousesService.getWarehousesStats();
  }

  @Get('tree')
  getWarehouseTree() {
    return this.warehousesService.getWarehouseTree();
  }

  @Get('locations')
  getWarehouseLocations() {
    return this.warehousesService.getWarehouseLocations();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.warehousesService.findOne(id);
  }

  @Get(':id/hierarchy')
  getHierarchy(@Param('id', ParseIntPipe) id: number) {
    return this.warehousesService.getWarehouseHierarchy(id);
  }

  @Get(':id/stock')
  getStock(@Param('id', ParseIntPipe) id: number) {
    return this.warehousesService.getWarehouseStock(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
  ) {
    return this.warehousesService.update(id, updateWarehouseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.warehousesService.remove(id);
  }
}
