import { ClientType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional } from 'class-validator';

export class ClientStatementFilterDto {
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  clientId: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : 1))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? parseInt(value) : 50))
  limit?: number = 50;

  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;
}
