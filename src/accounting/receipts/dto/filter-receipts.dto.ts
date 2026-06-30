import { Transform, Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class FilterReceiptsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  clientId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accountId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceId?: number;

  @IsOptional()
  @IsString()
  search?: string; // البحث في الوصف

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 20;
}
