import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export enum InvoiceType {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

export enum PaymentType {
  CASH = 'CASH',
  CREDIT = 'CREDIT',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export class CreateInvoiceConfigDto {
  @IsString()
  name: string; // اسم التكوين - Configuration Name (مطلوب وفريد)

  @IsEnum(InvoiceType)
  invoiceType: InvoiceType; // نوع الفاتورة

  @IsEnum(PaymentType)
  paymentType: PaymentType; // نوع الدفع

  @IsNumber()
  @Type(() => Number)
  debitAccountId: number; // الحساب المدين

  @IsNumber()
  @Type(() => Number)
  creditAccountId: number; // الحساب الدائن

  @IsOptional()
  @IsString()
  description?: string; // وصف التكوين

  @IsOptional()
  @IsBoolean()
  isActive?: boolean; // فعال أم لا
}
