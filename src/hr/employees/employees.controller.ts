import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../auth';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import { EmployeesService } from './employees.service';

@Controller('hr/employees')
@Auth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  // Allow broader access for creating employees (limited access)
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  // Allow broader access for viewing employees
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('jobId') jobId?: string,
    @Query('employmentStatus') employmentStatus?: string,
    @Query('managerId') managerId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.employeesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      jobId,
      employmentStatus,
      managerId,
      departmentId,
    );
  }

  @Get('stats')
  getStats() {
    return this.employeesService.getEmployeeStats();
  }

  @Get('by-job')
  getEmployeesByJob() {
    return this.employeesService.getEmployeesByJob();
  }

  @Get(':id')
  // Allow broader access for viewing individual employee details
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  // Allow broader access for editing employees (limited access)
  update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
