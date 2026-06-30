import {
  BadRequestException,
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
import { ConvertQuantityDto } from './dto/convert-quantity.dto';
import { CreateBulkUnitsDto } from './dto/create-bulk-units.dto';
import { CreateUnitCategoryDto } from './dto/create-unit-category.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UnitCategoryQueryDto } from './dto/unit-category-query.dto';
import { UnitQueryDto } from './dto/unit-query.dto';
import { UpdateUnitCategoryDto } from './dto/update-unit-category.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UnitCategoriesService } from './unit-categories.service';
import { UnitsService } from './units.service';

@Controller('units')
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
    private readonly unitCategoriesService: UnitCategoriesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  createBulk(@Body() createBulkUnitsDto: CreateBulkUnitsDto) {
    return this.unitsService.createBulk(createBulkUnitsDto);
  }

  @Get()
  findAll(@Query() query: UnitQueryDto) {
    return this.unitsService.findAll(query);
  }

  @Get('stats')
  getStats() {
    return this.unitsService.getUnitsStats();
  }

  @Post('categories/presets')
  @HttpCode(HttpStatus.CREATED)
  createPresetCategories() {
    return this.unitCategoriesService.createPresetCategories();
  }

  // Unit conversion endpoint
  @Get('convert/:fromUnitId/:toUnitId/:quantity')
  convertQuantity(
    @Param('fromUnitId', ParseIntPipe) fromUnitId: number,
    @Param('toUnitId', ParseIntPipe) toUnitId: number,
    @Param('quantity') quantity: string,
  ) {
    const numQuantity = parseFloat(quantity);
    if (isNaN(numQuantity)) {
      throw new BadRequestException('الكمية يجب أن تكون رقماً صحيحاً');
    }
    return this.unitsService.convertQuantity(numQuantity, fromUnitId, toUnitId);
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  convertQuantityPost(@Body() convertQuantityDto: ConvertQuantityDto) {
    return this.unitsService.convertQuantity(
      convertQuantityDto.quantity,
      convertQuantityDto.fromUnitId,
      convertQuantityDto.toUnitId,
    );
  }

  // Get units by category
  @Get('category/:categoryId/units')
  getUnitsByCategory(@Param('categoryId', ParseIntPipe) categoryId: number) {
    return this.unitsService.getUnitsByCategory(categoryId);
  }

  // ===============================
  // UNIT CATEGORIES ENDPOINTS
  // ===============================

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  createCategory(@Body() createUnitCategoryDto: CreateUnitCategoryDto) {
    return this.unitCategoriesService.create(createUnitCategoryDto);
  }

  @Get('categories')
  findAllCategories(@Query() query: UnitCategoryQueryDto) {
    return this.unitCategoriesService.findAll(query);
  }

  @Get('categories/stats')
  getCategoryStats() {
    return this.unitCategoriesService.getCategoryStats();
  }

  @Get('categories/:id')
  findOneCategory(@Param('id', ParseIntPipe) id: number) {
    return this.unitCategoriesService.findOne(id);
  }

  @Get('categories/:id/units')
  getCategoryUnits(@Param('id', ParseIntPipe) id: number) {
    return this.unitCategoriesService.getCategoryUnits(id);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUnitCategoryDto: UpdateUnitCategoryDto,
  ) {
    return this.unitCategoriesService.update(id, updateUnitCategoryDto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.unitCategoriesService.remove(id);
  }

  // ===============================
  // UNIT ENDPOINTS (MUST COME AFTER SPECIFIC ROUTES)
  // ===============================

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.unitsService.findOne(id);
  }

  @Get(':id/products')
  getUnitProducts(@Param('id', ParseIntPipe) id: number) {
    return this.unitsService.getUnitProducts(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUnitDto: UpdateUnitDto,
  ) {
    return this.unitsService.update(id, updateUnitDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.unitsService.remove(id);
  }
}
