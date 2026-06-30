import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
} from '@nestjs/common';
import { CreatePropertyGroupDto } from './dto/create-property-group.dto';
import { UpdatePropertyGroupDto } from './dto/update-property-group.dto';
import { PropertyGroupService } from './property-group.service';

@Controller('property-groups')
export class PropertyGroupController {
  constructor(private readonly propertyGroupService: PropertyGroupService) {}

  @Post()
  create(@Body() createPropertyGroupDto: CreatePropertyGroupDto) {
    return this.propertyGroupService.create(createPropertyGroupDto);
  }

  @Get()
  findAll(@Query('search') search?: string, @Request() req?: any) {
    const userId = req?.user?.userId || req?.user?.sub;
    const permissions = req?.user?.permissions || [];
    const isAdmin = permissions.includes('admin:all');
    return this.propertyGroupService.findAll(search, userId, isAdmin);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.propertyGroupService.findOne(id);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.propertyGroupService.getStatistics(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePropertyGroupDto: UpdatePropertyGroupDto,
  ) {
    return this.propertyGroupService.update(id, updatePropertyGroupDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.propertyGroupService.remove(id);
  }
}
