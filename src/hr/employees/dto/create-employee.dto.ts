import {
  EmploymentStatus,
  EmploymentType,
  Gender,
  ShiftType,
  WorkLocation,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsOptional()
  @IsString()
  fingerPrintId?: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsInt()
  workingHours?: number;

  @IsOptional()
  @IsInt()
  daysToWorkPerMonth?: number;

  // Address Information
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsDateString()
  startWorkingTime?: string;

  @IsOptional()
  @IsDateString()
  endWorkingTime?: string;

  @IsOptional()
  @IsInt()
  leavesAllowed?: number;

  // Employment Information
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  // Compensation
  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  // Work Details
  @IsOptional()
  @IsEnum(WorkLocation)
  workLocation?: WorkLocation;

  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  // Emergency Contact
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  // Relationships
  @IsOptional()
  @IsString()
  managerId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  encryptionKey?: string;

  // POS Access
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'PIN must be at least 4 digits' })
  @MaxLength(6, { message: 'PIN must be at most 6 digits' })
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  posPin?: string;

  @IsOptional()
  @IsBoolean()
  hasPOSAccess?: boolean;
}
