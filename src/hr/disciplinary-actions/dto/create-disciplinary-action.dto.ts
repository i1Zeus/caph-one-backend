import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ActionType {
  VERBAL_WARNING = 'VERBAL_WARNING',
  WRITTEN_WARNING = 'WRITTEN_WARNING',
  FINAL_WARNING = 'FINAL_WARNING',
  SALARY_DEDUCTION = 'SALARY_DEDUCTION',
  SUSPENSION = 'SUSPENSION',
  DEMOTION = 'DEMOTION',
  TERMINATION = 'TERMINATION',
  NOTE = 'NOTE',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ActionCategory {
  BEHAVIORAL = 'BEHAVIORAL',
  ATTENDANCE = 'ATTENDANCE',
  PERFORMANCE = 'PERFORMANCE',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  SAFETY = 'SAFETY',
  FINANCIAL = 'FINANCIAL',
  MISCONDUCT = 'MISCONDUCT',
  OTHER = 'OTHER',
}

export enum ActionStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  APPEALED = 'APPEALED',
  CANCELLED = 'CANCELLED',
}

export class CreateDisciplinaryActionDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsEnum(ActionType)
  @IsNotEmpty()
  type: ActionType;

  @IsEnum(Severity)
  @IsNotEmpty()
  severity: Severity;

  @IsEnum(ActionCategory)
  @IsOptional()
  category?: ActionCategory;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  actionDate: string;

  @IsString()
  @IsOptional()
  penalty?: string;

  @IsOptional()
  @Type(() => Number)
  deductionAmount?: number;

  @IsOptional()
  @IsNumber()
  deductionDays?: number;

  @IsOptional()
  @IsNumber()
  suspensionDays?: number;

  @IsString()
  @IsOptional()
  evidenceUrl?: string;

  @IsString()
  @IsOptional()
  witnessNames?: string;
}
