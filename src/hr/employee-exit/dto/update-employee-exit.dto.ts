import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ExitType } from './create-employee-exit.dto';

export class UpdateEmployeeExitDto {
  @IsEnum(ExitType)
  @IsOptional()
  exitType?: ExitType;

  @IsDateString()
  @IsOptional()
  exitDate?: string;

  @IsDateString()
  @IsOptional()
  lastWorkingDay?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  detailedReason?: string;

  @IsBoolean()
  @IsOptional()
  exitInterviewDone?: boolean;

  @IsDateString()
  @IsOptional()
  exitInterviewDate?: string;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsBoolean()
  @IsOptional()
  rehireEligible?: boolean;

  @IsBoolean()
  @IsOptional()
  assetReturned?: boolean;

  @IsBoolean()
  @IsOptional()
  documentsSigned?: boolean;

  @IsBoolean()
  @IsOptional()
  accessRevoked?: boolean;

  @IsBoolean()
  @IsOptional()
  exitInterviewCompleted?: boolean;

  @IsBoolean()
  @IsOptional()
  handoverCompleted?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  finalSettlement?: number;

  @IsBoolean()
  @IsOptional()
  settlementPaid?: boolean;

  @IsDateString()
  @IsOptional()
  settlementDate?: string;

  @IsString()
  @IsOptional()
  settlementNotes?: string;
}
