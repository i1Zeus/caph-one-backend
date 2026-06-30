import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsPositive, IsString } from 'class-validator';

export enum AdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
  SET = 'SET',
}

export class StockAdjustmentDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productId: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  warehouseId: number;

  @IsEnum(AdjustmentType)
  type: AdjustmentType;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsString()
  reason: string;
}
