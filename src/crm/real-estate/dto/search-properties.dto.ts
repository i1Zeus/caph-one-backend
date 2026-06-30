import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SearchPropertiesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minMatchPercentage?: number = 50; // الحد الأدنى لنسبة التطابق (افتراضي 50%)

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20; // عدد النتائج المطلوبة (افتراضي 20)
}
