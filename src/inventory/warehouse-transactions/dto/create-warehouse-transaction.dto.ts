import { WarehouseTransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { WarehouseTransactionItemDto } from './warehouse-transaction-item.dto';

export class CreateWarehouseTransactionDto {
  @IsEnum(WarehouseTransactionType)
  type: WarehouseTransactionType;

  // الطريقة الجديدة: دعم منتجات متعددة
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WarehouseTransactionItemDto)
  items?: WarehouseTransactionItemDto[];

  // الطريقة القديمة: منتج واحد (للتوافق مع الإصدارات السابقة)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  productId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  fromWarehouseId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  toWarehouseId?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  trackingId?: number; // معرف التتبع المحدد للحركة (للطريقة القديمة)

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  unitId?: number; // الوحدة المستخدمة في الحركة (للطريقة القديمة)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalPrice?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  partyName?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  // ربط بالفواتير (للإرجاعات والمبيعات)
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  salesInvoiceId?: number; // معرف فاتورة البيع المرتبطة

  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  purchaseInvoiceId?: number; // معرف فاتورة الشراء المرتبطة
}
