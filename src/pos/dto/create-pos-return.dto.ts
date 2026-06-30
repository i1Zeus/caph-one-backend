import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PrintFormat } from './create-pos-terminal.dto';

export class PosReturnItemDto {
  @IsInt()
  originalInvoiceItemId: number;

  @IsInt()
  productId: number;

  @IsNumber()
  @Min(0.01)
  quantity: number; // Positive value, will be converted to negative in service

  @IsNumber()
  @Min(0)
  @IsOptional()
  adjustedUnitPrice?: number; // Optional, for used/damaged items

  @IsInt()
  @IsOptional()
  unitId?: number;

  @IsInt()
  @IsOptional()
  trackingId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  toWarehouseId?: number; // Warehouse to return items to (per-item warehouse selection)
}

export class CreatePosReturnDto {
  @IsInt()
  @Type(() => Number)
  posSessionId: number; // Current session processing the return

  @IsString()
  employeeId: string; // Cashier processing return

  @IsInt()
  @Type(() => Number)
  originalInvoiceId: number; // Original invoice being returned

  @IsInt()
  @Type(() => Number)
  warehouseId: number; // Where items return to

  @IsEnum(['CASH', 'CREDIT', 'CARD', 'BANK_TRANSFER'])
  paymentType: string; // Typically CASH for refunds

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  clientId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  invoiceConfigId?: number;

  @IsEnum(PrintFormat)
  @IsOptional()
  printFormat?: PrintFormat;

  @IsString()
  @IsOptional()
  notes?: string; // Return reason/notes

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosReturnItemDto)
  items: PosReturnItemDto[];
}
