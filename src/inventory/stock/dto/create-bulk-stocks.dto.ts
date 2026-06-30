import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateStockDto } from './create-stock.dto';

export class CreateBulkStocksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStockDto)
  stocks: CreateStockDto[];
}
