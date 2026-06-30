import {
  DiscountType,
  InvoiceStatus,
  ProductTrackingType,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateTrackingDataDto {
  @IsEnum(ProductTrackingType)
  trackingType: ProductTrackingType;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  batchName?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  storageUnitId?: number;

  @IsOptional()
  @IsDateString()
  productionDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseInvoiceItemDto {
  @IsNumber()
  @Type(() => Number)
  productId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitId?: number;

  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  trackingId?: number;

  // New tracking data for creating tracking on-the-fly
  @IsOptional()
  newTracking?: CreateTrackingDataDto;
}

export class CreatePurchaseInvoiceDto {
  @IsOptional()
  @IsString()
  invoiceNumber?: string; // رقم الفاتورة (اختياري - سيتم توليده تلقائياً إذا لم يتم تحديده)

  @IsNumber()
  @Type(() => Number)
  supplierId: number; // المورد (يجب أن يكون من نوع SUPPLIER)

  @IsNumber()
  @Type(() => Number)
  totalAmount: number; // المبلغ الإجمالي

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  paidAmount?: number; // المبلغ المدفوع (افتراضي 0)

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus; // حالة الفاتورة (افتراضي UNPAID)

  @IsOptional()
  @IsString()
  description?: string; // وصف الفاتورة

  @IsOptional()
  @IsString()
  notes?: string; // ملاحظات

  @IsOptional()
  @IsDateString()
  dueDate?: string; // تاريخ الاستحقاق

  @IsOptional()
  @IsDateString()
  invoiceDate?: string; // تاريخ الفاتورة (افتراضي اليوم)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currencyId?: number; // Optional currency ID - if not provided, will use main currency

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  invoiceConfigId?: number; // معرف تكوين الفاتورة المحاسبي (اختياري - إذا لم يُحدد، لن يتم إنشاء قيود محاسبية)

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  warehouseId?: number; // المخزن (مطلوب عند إضافة أصناف)

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseInvoiceItemDto)
  items?: CreatePurchaseInvoiceItemDto[]; // أصناف الفاتورة

  // Discount Fields
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount?: number; // قيمة الخصم

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType; // نوع الخصم (FIXED أو PERCENTAGE)
}
