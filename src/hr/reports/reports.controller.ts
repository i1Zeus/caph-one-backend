import { Controller, Get, Query } from '@nestjs/common';
import { Auth } from '../../auth';
import { AttendanceReportDto } from './dto';
import { ReportsService } from './reports.service';

@Controller('hr/reports')
@Auth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance')
  async getAttendanceReport(@Query() dto: AttendanceReportDto) {
    return this.reportsService.generateAttendanceReport(dto);
  }

  @Get('late-arrivals')
  async getLateArrivalReport(@Query() dto: AttendanceReportDto) {
    return this.reportsService.generateLateArrivalReport(dto);
  }

  @Get('absence')
  async getAbsenceReport(@Query() dto: AttendanceReportDto) {
    return this.reportsService.generateAbsenceReport(dto);
  }

  @Get('overtime')
  async getOvertimeReport(@Query() dto: AttendanceReportDto) {
    return this.reportsService.generateOvertimeReport(dto);
  }

  @Get('summary')
  async getSummaryReport(@Query() dto: AttendanceReportDto) {
    return this.reportsService.generateSummaryReport(dto);
  }
}
