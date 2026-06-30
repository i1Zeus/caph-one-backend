import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class AnalyticsQueryDto {
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  posSessionId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  posId?: number;
}
