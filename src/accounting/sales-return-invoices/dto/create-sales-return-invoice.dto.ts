import { InvoiceStatus, PaymentType } from '@prisma/client';
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

export class ReturnPaymentSplitDto {
  @IsNumber()
  @Type(() => Number)
  amount: number; // المبلغ المسترد بهذه الطريقة

  @IsEnum(PaymentType)
  paymentType: PaymentType; // طريقة الدفع

  @IsNumber()
  @Type(() => Number)
  accountId: number; // الحساب الذي سيتم الدفع منه (صندوق أو بنك)
}

export class CreateSalesReturnInvoiceItemDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  originalSalesInvoiceItemId: number; // معرف صنف فاتورة البيع الأصلي

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

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  toWarehouseId: number; // المخزن الذي سيتم إرجاع البضاعة إليه
}

export class CreateSalesReturnInvoiceDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  salesInvoiceId: number; // معرف فاتورة البيع الأصلية

  @IsOptional()
  @IsString()
  returnInvoiceNumber?: string; // رقم فاتورة الإرجاع (سيتم توليده تلقائياً إذا لم يتم تزويده)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesReturnInvoiceItemDto)
  items: CreateSalesReturnInvoiceItemDto[]; // أصناف الإرجاع

  @IsOptional()
  @IsString()
  notes?: string; // ملاحظات

  @IsOptional()
  @IsString()
  returnReason?: string; // سبب الإرجاع

  @IsOptional()
  @IsString()
  referenceInvoiceNumber?: string; // رقم الفاتورة المرجعية من العميل

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnPaymentSplitDto)
  payments?: ReturnPaymentSplitDto[]; // طرق استرداد المبلغ (اختياري)
}
