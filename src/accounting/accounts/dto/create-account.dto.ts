import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '@prisma/client';

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(AccountType)
  type: AccountType;

  @IsString()
  @IsOptional()
  code?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCash?: boolean; // هل هذا حساب نقدي؟

  @IsOptional()
  @Type(() => Number)
  currencyId?: number; // Optional currency ID

  @IsOptional()
  @Type(() => Number)
  parentId?: number; // Parent account ID for hierarchical structure
}
