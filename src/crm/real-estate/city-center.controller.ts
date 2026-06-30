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
import { CityCenterService } from './city-center.service';
import { CreateCityCenterDto } from './dto/create-city-center.dto';
import { UpdateCityCenterDto } from './dto/update-city-center.dto';

@Controller('city-centers')
export class CityCenterController {
  constructor(private readonly cityCenterService: CityCenterService) {}

  @Post()
  create(@Body() createCityCenterDto: CreateCityCenterDto) {
    return this.cityCenterService.create(createCityCenterDto);
  }

  @Get()
  findAll(@Query('search') search?: string, @Request() req?: any) {
    const userId = req?.user?.userId || req?.user?.sub;
    const permissions = req?.user?.permissions || [];
    const isAdmin = permissions.includes('admin:all');
    return this.cityCenterService.findAll(search, userId, isAdmin);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cityCenterService.findOne(id);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.cityCenterService.getStatistics(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCityCenterDto: UpdateCityCenterDto,
  ) {
    return this.cityCenterService.update(id, updateCityCenterDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cityCenterService.remove(id);
  }
}
