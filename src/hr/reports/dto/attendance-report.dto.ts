import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class AttendanceReportDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsString()
  @IsOptional()
  jobId?: string;
}

export interface AttendanceReportData {
  employee: {
    id: string;
    firstName: string;
    lastName?: string;
    job?: { name: string };
    fingerPrintId?: string;
  };
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  averageLateMinutes: number;
  totalOvertimeMinutes: number;
  averageOvertimeMinutes: number;
  totalWorkedHours: number;
  expectedWorkHours: number;
  attendanceRate: number;
  records: Array<{
    date: string;
    status: string;
    timeIn?: string;
    timeOut?: string;
    lateMinutes: number;
    overtimeMinutes: number;
    workedHours: number;
  }>;
}
