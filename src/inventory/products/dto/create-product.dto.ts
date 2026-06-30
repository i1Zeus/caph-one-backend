import { ProductType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'اسم المنتج يجب أن يكون أطول من حرفين' })
  @MaxLength(255, { message: 'اسم المنتج يجب أن يكون أقصر من 255 حرف' })
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'الباركود يجب أن يكون أطول من 3 أحرف' })
  @MaxLength(50, { message: 'الباركود يجب أن يكون أقصر من 50 حرف' })
  barcode: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'وصف المنتج يجب أن يكون أقصر من 1000 حرف' })
  description?: string;

  @IsEnum(ProductType, { message: 'نوع المنتج يجب أن يكون PRODUCT أو SERVICE' })
  @IsOptional()
  type?: ProductType = ProductType.PRODUCT;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  salesUnitId?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  purchaseUnitId?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'سعر الشراء يجب أن يكون رقماً' })
  @IsOptional()
  @Min(0, { message: 'سعر الشراء يجب أن يكون أكبر من أو يساوي الصفر' })
  purchasePrice?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'سعر البيع يجب أن يكون رقماً' })
  @IsOptional()
  @Min(0, { message: 'سعر البيع يجب أن يكون أكبر من أو يساوي الصفر' })
  salePrice?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'حد التنبيه للمخزون يجب أن يكون رقماً' })
  @IsOptional()
  @Min(0, { message: 'حد التنبيه للمخزون يجب أن يكون أكبر من أو يساوي الصفر' })
  minStockAlert?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map((v) => Number(v));
    }
    // Handle single value or string representation
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.map((v) => Number(v))
          : [Number(parsed)];
      } catch {
        return [Number(value)];
      }
    }
    return [Number(value)];
  })
  categoryIds?: number[];
}
