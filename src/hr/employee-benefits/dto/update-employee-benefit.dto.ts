import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BenefitFrequency, BenefitType } from './create-employee-benefit.dto';

export class UpdateEmployeeBenefitDto {
  @IsEnum(BenefitType)
  @IsOptional()
  type?: BenefitType;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  policyNumber?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  coverage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  premium?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amount?: number;

  @IsEnum(BenefitFrequency)
  @IsOptional()
  frequency?: BenefitFrequency;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;
}
