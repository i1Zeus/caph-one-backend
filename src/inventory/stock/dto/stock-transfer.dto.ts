import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class StockTransferDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productId: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  fromWarehouseId: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  toWarehouseId: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}
