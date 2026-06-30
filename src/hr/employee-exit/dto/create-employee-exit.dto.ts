import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum ExitType {
  RESIGNATION = 'RESIGNATION',
  TERMINATION = 'TERMINATION',
  RETIREMENT = 'RETIREMENT',
  CONTRACT_END = 'CONTRACT_END',
  MUTUAL_AGREEMENT = 'MUTUAL_AGREEMENT',
  DEATH = 'DEATH',
  OTHER = 'OTHER',
}

export class CreateEmployeeExitDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsEnum(ExitType)
  @IsNotEmpty()
  exitType: ExitType;

  @IsDateString()
  @IsNotEmpty()
  exitDate: string;

  @IsDateString()
  @IsNotEmpty()
  lastWorkingDay: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  detailedReason?: string;

  @IsBoolean()
  @IsOptional()
  rehireEligible?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  finalSettlement?: number;

  @IsString()
  @IsOptional()
  settlementNotes?: string;
}
