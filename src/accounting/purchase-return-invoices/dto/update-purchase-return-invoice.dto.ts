import { InvoiceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseReturnInvoiceDto {
  @IsOptional()
  @IsString()
  notes?: string; // ملاحظات

  @IsOptional()
  @IsString()
  returnReason?: string; // سبب الإرجاع

  @IsOptional()
  @IsString()
  referenceInvoiceNumber?: string; // رقم الفاتورة المرجعية من الشركة الموردة

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus; // حالة فاتورة الإرجاع

  @IsOptional()
  @IsDateString()
  returnDate?: string; // تاريخ الإرجاع
}
