import { ProductTrackingType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class NewTrackingDto {
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

export class WarehouseTransactionItemDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productId: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  trackingId?: number; // معرف التتبع المحدد للحركة

  @IsOptional()
  @ValidateNested()
  @Type(() => NewTrackingDto)
  newTracking?: NewTrackingDto; // بيانات إنشاء تتبع جديد

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  unitId?: number; // الوحدة المستخدمة في الحركة

  @IsOptional()
  @IsNumber()
  @Min(0) // Allow zero prices for free items, adjustments, etc.
  @Type(() => Number)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) // Allow zero total prices
  @Type(() => Number)
  totalPrice?: number;

  @IsOptional()
  @IsString()
  itemNote?: string;

  // دعم المخازن المحددة لكل صنف (للمعاملات المعقدة)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  fromWarehouseId?: number; // المخزن المصدر لهذا الصنف

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  toWarehouseId?: number; // المخزن الهدف لهذا الصنف

  // ربط بأصناف الفواتير الأصلية (للإرجاعات)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  originalSalesInvoiceItemId?: number; // معرف صنف فاتورة البيع الأصلي

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  originalPurchaseInvoiceItemId?: number; // معرف صنف فاتورة الشراء الأصلي
}
