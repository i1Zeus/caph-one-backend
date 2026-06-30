import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class CreateBulkProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}
