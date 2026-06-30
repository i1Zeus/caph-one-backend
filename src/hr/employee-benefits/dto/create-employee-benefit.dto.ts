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

export enum BenefitType {
  HEALTH_INSURANCE = 'HEALTH_INSURANCE',
  LIFE_INSURANCE = 'LIFE_INSURANCE',
  DENTAL_INSURANCE = 'DENTAL_INSURANCE',
  VISION_INSURANCE = 'VISION_INSURANCE',
  PENSION = 'PENSION',
  BONUS = 'BONUS',
  ALLOWANCE = 'ALLOWANCE',
  TRANSPORTATION = 'TRANSPORTATION',
  HOUSING = 'HOUSING',
  MEAL_VOUCHER = 'MEAL_VOUCHER',
  PHONE_ALLOWANCE = 'PHONE_ALLOWANCE',
  EDUCATION = 'EDUCATION',
  GYM_MEMBERSHIP = 'GYM_MEMBERSHIP',
  STOCK_OPTIONS = 'STOCK_OPTIONS',
  COMMISSION = 'COMMISSION',
  OTHER = 'OTHER',
}

export enum BenefitFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUAL = 'SEMI_ANNUAL',
  ANNUAL = 'ANNUAL',
  ONE_TIME = 'ONE_TIME',
}

export class CreateEmployeeBenefitDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsEnum(BenefitType)
  @IsNotEmpty()
  type: BenefitType;

  @IsString()
  @IsNotEmpty()
  name: string;

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
  @IsNotEmpty()
  startDate: string;

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
