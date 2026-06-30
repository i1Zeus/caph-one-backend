import { ClientType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType; // نوع العميل: CUSTOMER أو SUPPLIER

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accountId?: number; // الحساب المرتبط بهذا العميل
}
