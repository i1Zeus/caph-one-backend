import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { CreateUnitDto } from './create-unit.dto';

export class CreateBulkUnitsDto {
  @IsNumber()
  @Type(() => Number)
  categoryId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUnitDto)
  units: CreateUnitDto[];
}
