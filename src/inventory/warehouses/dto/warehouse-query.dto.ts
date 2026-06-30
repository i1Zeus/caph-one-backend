import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class WarehouseQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  // Note: Department functionality removed as departments are not in current schema
  // @IsOptional()
  // @IsNumber()
  // @Transform(({ value }) => parseInt(value))
  // departmentId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  parentId?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  hasParent?: boolean; // للبحث عن المخازن الرئيسية أو الفرعية

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}
