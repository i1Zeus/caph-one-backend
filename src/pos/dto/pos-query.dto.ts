import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class PosQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsString()
  @IsOptional()
  search?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  warehouseId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;
}

export class SessionQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  posId?: number;

  @IsString()
  @IsOptional()
  employeeId?: string;

  @IsEnum(['OPEN', 'CLOSED', 'SUSPENDED'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
