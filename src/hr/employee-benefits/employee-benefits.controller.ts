import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Auth } from '../../auth';
import {
  CreateEmployeeBenefitDto,
  GetEmployeeBenefitsDto,
  UpdateEmployeeBenefitDto,
} from './dto';
import { EmployeeBenefitsService } from './employee-benefits.service';

@Controller('hr/employee-benefits')
@Auth()
export class EmployeeBenefitsController {
  constructor(private readonly benefitsService: EmployeeBenefitsService) {}

  @Post()
  async create(@Body() createDto: CreateEmployeeBenefitDto) {
    return this.benefitsService.create(createDto);
  }

  @Get()
  async findAll(@Query() dto: GetEmployeeBenefitsDto) {
    return this.benefitsService.findAll(dto);
  }

  @Get('stats')
  async getStats(@Query('employeeId') employeeId?: string) {
    return this.benefitsService.getStats(employeeId);
  }

  @Get('expiring')
  async getExpiring(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.benefitsService.getExpiring(daysNum);
  }

  @Get('employee/:employeeId')
  async findByEmployee(@Param('employeeId') employeeId: string) {
    return this.benefitsService.findByEmployee(employeeId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.benefitsService.findOne(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeBenefitDto,
  ) {
    return this.benefitsService.update(id, updateDto);
  }

  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.benefitsService.deactivate(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.benefitsService.remove(id);
  }
}
