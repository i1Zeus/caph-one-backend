import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export enum ClientTypeFilter {
  ALL = 'ALL',
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
}

export class UnpaidClientsFilterDto {
  @IsOptional()
  @IsEnum(ClientTypeFilter)
  clientType?: ClientTypeFilter;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : 1))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : 50))
  limit?: number = 50;
}
