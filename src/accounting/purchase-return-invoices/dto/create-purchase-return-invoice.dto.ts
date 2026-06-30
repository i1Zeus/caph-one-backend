import { InvoiceStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseReturnInvoiceItemDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  originalPurchaseInvoiceItemId: number; // معرف صنف فاتورة الشراء الأصلي

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number; // معرف المنتج

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity: number; // الكمية المرجعة

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice: number; // سعر الوحدة

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitId?: number; // معرف الوحدة (اختياري)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  trackingId?: number; // معرف التتبع (اختياري)

  @IsOptional()
  @IsString()
  notes?: string; // ملاحظات خاصة بالصنف

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  fromWarehouseId?: number; // المخزن الذي سيتم إرجاع البضاعة منه (سيتم تحديده تلقائياً من فاتورة الشراء الأصلية)
}

export class CreatePurchaseReturnInvoiceDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  purchaseInvoiceId: number; // معرف فاتورة الشراء الأصلية

  @IsOptional()
  @IsString()
  returnInvoiceNumber?: string; // رقم فاتورة الإرجاع (سيتم توليده تلقائياً إذا لم يتم تزويده)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnInvoiceItemDto)
  items: CreatePurchaseReturnInvoiceItemDto[]; // أصناف الإرجاع

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
  status?: InvoiceStatus; // حالة فاتورة الإرجاع (افتراضي PAID)

  @IsOptional()
  @IsDateString()
  returnDate?: string; // تاريخ الإرجاع (افتراضي اليوم)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currencyId?: number; // العملة (اختياري)

  @IsOptional()
  @IsString()
  departmentId?: string; // القسم (اختياري) - String لأن Department يستخدم String ID
}
