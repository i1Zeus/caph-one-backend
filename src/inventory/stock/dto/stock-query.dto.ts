import { Transform } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class StockQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  productId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  warehouseId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  departmentId?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === '1';
    }
    return Boolean(value);
  })
  lowStock?: boolean; // للبحث عن المخزون المنخفض

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      return lowerValue === 'true' || lowerValue === '1';
    }
    return Boolean(value);
  })
  outOfStock?: boolean; // للبحث عن المخزون المنتهي

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  minQuantity?: number; // الحد الأدنى للكمية

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  maxQuantity?: number; // الحد الأقصى للكمية

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}
