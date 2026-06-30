import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export enum ProductTrackingType {
  NONE = 'NONE',
  LOT = 'LOT',
  SERIAL = 'SERIAL',
}

export class CreateTrackingDto {
  @IsEnum(ProductTrackingType)
  trackingType: ProductTrackingType;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  batchName?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  storageUnitId?: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @Type(() => Date)
  productionDate?: Date;

  @IsOptional()
  @Type(() => Date)
  expiryDate?: Date;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStockDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productId: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  warehouseId: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  reorderLevel?: number;

  @ValidateNested()
  @Type(() => CreateTrackingDto)
  tracking: CreateTrackingDto;
}
