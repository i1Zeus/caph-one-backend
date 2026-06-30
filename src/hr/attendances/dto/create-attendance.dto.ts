import { AttendanceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateAttendanceDto {
  @IsString()
  employeeId: string;

  @IsDateString()
  date: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsDateString()
  timeIn?: string;

  @IsOptional()
  @IsDateString()
  timeOut?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
