import { Transform } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class ReceiptsReportFilterDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  clientId?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : undefined))
  accountId?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : 1))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : 50))
  limit?: number = 50;
}
