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
import { CreateSportsCityDto } from './dto/create-sports-city.dto';
import { UpdateSportsCityDto } from './dto/update-sports-city.dto';
import { SportsCityService } from './sports-city.service';

@Controller('sports-cities')
export class SportsCityController {
  constructor(private readonly sportsCityService: SportsCityService) {}

  @Post()
  create(@Body() createSportsCityDto: CreateSportsCityDto) {
    return this.sportsCityService.create(createSportsCityDto);
  }

  @Get()
  findAll(@Query('search') search?: string, @Request() req?: any) {
    const userId = req?.user?.userId || req?.user?.sub;
    const permissions = req?.user?.permissions || [];
    const isAdmin = permissions.includes('admin:all');
    return this.sportsCityService.findAll(search, userId, isAdmin);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sportsCityService.findOne(id);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.sportsCityService.getStatistics(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSportsCityDto: UpdateSportsCityDto,
  ) {
    return this.sportsCityService.update(id, updateSportsCityDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sportsCityService.remove(id);
  }
}
