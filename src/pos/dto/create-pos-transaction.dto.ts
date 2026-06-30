import { DiscountType, PaymentType } from '@prisma/client';
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

export class PosTransactionItemDto {
  @IsInt()
  productId: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsInt()
  @IsOptional()
  unitId?: number;

  @IsInt()
  @IsOptional()
  trackingId?: number;
}

export class PaymentSplitDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount: number; // المبلغ لهذه الطريقة

  @IsEnum(PaymentType)
  paymentType: PaymentType; // طريقة الدفع

  @IsInt()
  @Type(() => Number)
  accountId: number; // الحساب الذي سيستلم المال (صندوق أو بنك)
}

export class CreatePosTransactionDto {
  @IsInt()
  @Type(() => Number)
  posSessionId: number;

  @IsString()
  employeeId: string;

  @IsInt()
  @Type(() => Number)
  warehouseId: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  clientId?: number;

  // Support both old single payment and new payment splits
  @IsOptional()
  @IsEnum(['CASH', 'CREDIT', 'CARD', 'BANK_TRANSFER'])
  paymentType?: string; // Legacy - use payments array instead

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paidAmount?: number; // Legacy - use payments array instead

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentSplitDto)
  payments?: PaymentSplitDto[]; // تقسيمات الدفع (طريقة جديدة)

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  invoiceConfigId?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalAmount: number;

  @IsEnum(PrintFormat)
  @IsOptional()
  printFormat?: PrintFormat;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosTransactionItemDto)
  items: PosTransactionItemDto[];

  // Discount fields
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;
}
