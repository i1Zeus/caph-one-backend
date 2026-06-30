import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AccountType } from '@prisma/client';

export class AccountImportItem {
  @IsString()
  @IsNotEmpty()
  code: string; // رمز الحساب

  @IsString()
  @IsNotEmpty()
  name: string; // اسم الحساب

  @IsEnum(AccountType)
  type: AccountType; // نوع الحساب

  @IsOptional()
  @IsBoolean()
  isCash?: boolean; // هل هو حساب نقدي؟

  @IsOptional()
  @IsNumber()
  currencyId?: number; // معرف العملة
}

export class ImportAccountsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AccountImportItem)
  accounts: AccountImportItem[];

  @IsOptional()
  @IsBoolean()
  skipExisting?: boolean; // تخطي الحسابات الموجودة بدلاً من إرجاع خطأ
}

export class ImportAccountsResponseDto {
  created: number; // عدد الحسابات المُنشأة
  skipped: number; // عدد الحسابات المتخطاة
  failed: number; // عدد الحسابات الفاشلة
  errors: Array<{
    account: string;
    error: string;
  }>; // تفاصيل الأخطاء
  accounts: Array<{
    id: number;
    name: string;
    type: string;
    code: string;
  }>; // قائمة الحسابات المُنشأة
}
