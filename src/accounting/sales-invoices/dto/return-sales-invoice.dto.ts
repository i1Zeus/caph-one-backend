import { PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class LegacyReturnPaymentSplitDto {
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsNumber()
  @Type(() => Number)
  accountId: number;
}

export class ReturnSalesInvoiceItemDto {
  @IsNumber()
  @Type(() => Number)
  originalSalesInvoiceItemId: number; // ID of the original invoice item

  @IsNumber()
  @Type(() => Number)
  productId: number;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number; // Quantity to return

  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  trackingId?: number;

  @IsNumber()
  @Type(() => Number)
  toWarehouseId: number; // Warehouse to return items to

  @IsOptional()
  @IsString()
  itemNote?: string;
}

export class ReturnSalesInvoiceDto {
  @IsNumber()
  @Type(() => Number)
  salesInvoiceId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnSalesInvoiceItemDto)
  items: ReturnSalesInvoiceItemDto[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  returnReason?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegacyReturnPaymentSplitDto)
  payments?: LegacyReturnPaymentSplitDto[];
}
