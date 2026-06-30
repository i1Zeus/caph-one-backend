import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Auth } from '../../auth';
import {
  CreateSalaryDto,
  GenerateSalarySlipsDto,
  UpdateSalaryDto,
} from './dto';
import { SalariesService } from './salaries.service';

@Controller('hr/salaries')
@Auth()
export class SalariesController {
  constructor(private readonly salariesService: SalariesService) {}

  @Post()
  create(@Body() createSalaryDto: CreateSalaryDto) {
    return this.salariesService.create(createSalaryDto);
  }

  @Post('generate-slips')
  generateSalarySlips(
    @Body() generateSalarySlipsDto: GenerateSalarySlipsDto,
    @Req() req: any,
  ) {
    // Add the current user as paidById if not provided
    if (!generateSalarySlipsDto.paidById && req.user?.id) {
      generateSalarySlipsDto.paidById = req.user.id;
    }
    return this.salariesService.generateSalarySlips(generateSalarySlipsDto);
  }

  @Post('regenerate-slips')
  regenerateSalarySlips(
    @Body() generateSalarySlipsDto: GenerateSalarySlipsDto,
    @Req() req: any,
  ) {
    // Add the current user as paidById if not provided
    if (!generateSalarySlipsDto.paidById && req.user?.id) {
      generateSalarySlipsDto.paidById = req.user.id;
    }
    return this.salariesService.regenerateSalarySlips(generateSalarySlipsDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('employeeId') employeeId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('encryptionKey') encryptionKey?: string,
  ) {
    return this.salariesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      employeeId,
      year ? parseInt(year) : undefined,
      month ? parseInt(month) : undefined,
      workspaceId,
      encryptionKey,
    );
  }

  @Get('stats')
  getStats(
    @Query('workspaceId') workspaceId?: string,
    @Query('encryptionKey') encryptionKey?: string,
  ) {
    return this.salariesService.getSalaryStats(workspaceId, encryptionKey);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('encryptionKey') encryptionKey?: string,
  ) {
    return this.salariesService.findOne(id, encryptionKey);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalaryDto: UpdateSalaryDto) {
    return this.salariesService.update(id, updateSalaryDto);
  }

  @Patch(':id/mark-paid')
  markAsPaid(@Param('id') id: string) {
    return this.salariesService.markAsPaid(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salariesService.remove(id);
  }

  // Temporary endpoint to fix employee working times
  @Patch('fix-employee-working-times/:employeeId')
  fixEmployeeWorkingTimes(
    @Param('employeeId') employeeId: string,
    @Body() body?: { startTime?: string; endTime?: string },
  ) {
    return this.salariesService.fixEmployeeWorkingTimes(
      employeeId,
      body?.startTime || '09:00',
      body?.endTime || '17:00',
    );
  }

  // Test endpoint to verify time calculations for specific attendance
  @Get('test-attendance/:employeeId/:date')
  testSpecificAttendance(
    @Param('employeeId') employeeId: string,
    @Param('date') date: string,
  ) {
    return this.salariesService.testSpecificAttendance(employeeId, date);
  }

  // Debug endpoint to test time calculations
  @Get('debug-time-calculations')
  debugTimeCalculations() {
    return this.salariesService.debugTimeCalculations();
  }
}
