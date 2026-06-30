import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

export class ConvertQuantityDto {
  @IsNumber()
  @Type(() => Number)
  fromUnitId: number;

  @IsNumber()
  @Type(() => Number)
  toUnitId: number;

  @IsNumber()
  @Type(() => Number)
  @IsPositive({ message: 'الكمية يجب أن تكون موجبة' })
  quantity: number;
}
