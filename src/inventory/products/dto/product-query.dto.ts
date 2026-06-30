import { ProductType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  unitId?: number;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsOptional()
  @IsString()
  // @Transform(({ value }) => value === 'true')
  isActive?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isDeleted?: boolean;
}
