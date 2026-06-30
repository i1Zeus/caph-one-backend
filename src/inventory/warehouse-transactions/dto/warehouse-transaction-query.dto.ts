import { WarehouseTransactionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class WarehouseTransactionQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(WarehouseTransactionType)
  type?: WarehouseTransactionType;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  productId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  fromWarehouseId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  toWarehouseId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  warehouseId?: number; // للبحث في أي مخزن (من أو إلى)

  // Note: Department filtering removed as departments are not in current schema
  // @IsOptional()
  // @IsNumber()
  // @Transform(({ value }) => parseInt(value))
  // departmentId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  maxAmount?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}
