import { LeadStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';

export class UpdateLeadDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsInt()
  @IsOptional()
  order?: number;

  @ValidateIf(
    (object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @ValidateIf(
    (object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsUUID()
  salesManId?: string;

  @IsInt()
  @IsOptional()
  employeeCount?: number;

  @IsNumber()
  @IsOptional()
  revenue?: number;

  @IsEnum(LeadStatus)
  @IsOptional()
  status?: LeadStatus;

  @IsBoolean()
  @IsOptional()
  isCompany?: boolean;

  @ValidateIf(
    (object, value) => value !== undefined && value !== null && value !== '',
  )
  @IsUUID()
  workspaceId?: string;

  @IsString()
  @IsOptional()
  stageId?: string;
}
