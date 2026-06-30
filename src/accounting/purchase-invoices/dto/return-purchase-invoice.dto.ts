import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReturnPurchaseInvoiceItemDto {
  @IsNumber()
  @Type(() => Number)
  originalPurchaseInvoiceItemId: number; // ID of the original invoice item

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
  fromWarehouseId: number; // Warehouse to return items from

  @IsOptional()
  @IsString()
  itemNote?: string;
}

export class ReturnPurchaseInvoiceDto {
  @IsNumber()
  @Type(() => Number)
  purchaseInvoiceId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnPurchaseInvoiceItemDto)
  items: ReturnPurchaseInvoiceItemDto[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  returnReason?: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;
}
