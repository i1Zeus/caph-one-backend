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
  Request,
} from '@nestjs/common';
import {
  CityCenterFilter,
  PropertyGroupFilter,
  PropertyStatus,
  PropertyType,
} from '@prisma/client';
import { AutoAudit } from '../../audit/interceptors/audit.interceptor';
import { Auth } from '../../auth';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import { PropertyService } from './property.service';

@Controller('crm/properties')
@AutoAudit('Real Estate - Properties')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post()
  @Auth()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertyService.create(createPropertyDto);
  }

  @Get()
  @Auth()
  async findAll(
    @Query('propertyType') propertyType?: PropertyType,
    @Query('status') status?: PropertyStatus,
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('groupId') groupId?: string,
    @Query('cityCenterId') cityCenterId?: string,
    @Query('sportsCityId') sportsCityId?: string,
    @Query('propertyGroupFilter') propertyGroupFilter?: PropertyGroupFilter,
    @Query('cityCenterFilter') cityCenterFilter?: CityCenterFilter,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const filters: any = {};
    if (propertyType) filters.propertyType = propertyType;
    if (status) filters.status = status;
    if (city) filters.city = city;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (groupId) filters.groupId = parseInt(groupId);
    if (cityCenterId) filters.cityCenterId = parseInt(cityCenterId);
    if (sportsCityId) filters.sportsCityId = parseInt(sportsCityId);
    if (propertyGroupFilter) filters.propertyGroupFilter = propertyGroupFilter;
    if (cityCenterFilter) filters.cityCenterFilter = cityCenterFilter;

    const userId = req?.user?.userId || req?.user?.sub;
    const permissions = req?.user?.permissions || [];
    const isAdmin = permissions.includes('admin:all');

    // If pagination params are provided, use paginated endpoint
    if (page || limit) {
      const pageNum = parseInt(page || '1', 10) || 1;
      const limitNum = Math.min(parseInt(limit || '10', 10) || 10, 100); // Max 100 items per page
      return this.propertyService.findAllPaginated(
        filters,
        pageNum,
        limitNum,
        userId,
        isAdmin,
      );
    }

    return this.propertyService.findAll(filters, userId, isAdmin);
  }

  @Get('statistics')
  @Auth()
  async getStatistics() {
    return this.propertyService.getStatistics();
  }

  @Get('extract-coordinates')
  @Auth()
  async extractCoordinates(@Query('url') url: string) {
    return this.propertyService.extractCoordinatesFromUrl(url);
  }

  @Get(':id')
  @Auth()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertyService.findOne(id);
  }

  @Patch(':id')
  @Auth()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(id, updatePropertyDto);
  }

  @Delete(':id')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.propertyService.remove(id);
  }
}
